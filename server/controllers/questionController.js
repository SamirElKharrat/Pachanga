const { Op } = require('sequelize');
const sequelize = require('../config/configdb');
const Question = require('../models/question');
const QuestionAnswer = require('../models/questionAnswer');
const League = require('../models/league');
const User = require('../models/user');
const statsAggregator = require('../utils/statsAggregator');
const Round = require('../models/round');
const { roundFor } = require('../utils/rounds');
const {
    ANSWER_TYPES, TEXT_ANSWER_MAX, normalizeAnswer, isSettled, isAnswerCorrect,
} = require('../utils/pointsCalculator');

/**
 * The weekly questions.
 *
 * Two things in here are worth reading before changing anything:
 *
 *  - Answers are final. Nothing in this file updates one, and the unique index on
 *    (question_id, user_id) makes sure nothing else can either.
 *
 *  - Points are never touched directly. Settling a question (marking the right
 *    option, or the accepted texts) hands the week to statsAggregator.applyWeekPoints,
 *    exactly like entering a result does. Adding points to LeagueParticipation from
 *    here would make them show up in the stats screens as "added by hand" — see the
 *    comment on points_manual.
 *
 *  - Two kinds of question: 'choice' (pick one of `options`) and 'text' (write it).
 *    Whether an answer is right is decided ONLY by pointsCalculator.isAnswerCorrect,
 *    and `closed_at` is what says a question is settled, for both kinds.
 */

/**
 * The logged-in user, from the token.
 *
 * @param {Object} req
 * @returns {Promise<Object|null>}
 */
const currentUser = (req) => User.findOne({
    where: { email: req.user.email },
    attributes: { exclude: ['password'] }
});

/**
 * Hands a league week to the aggregator so the standings and the stats catch up.
 *
 * Deliberately allowed to throw: if the points cannot be applied, the admin has to
 * find out rather than believe the week is closed. Running it twice is harmless.
 *
 * @param {number} leagueId
 * @param {number} week
 */
const applyPoints = (leagueId, week) => statsAggregator.applyWeekPoints(leagueId, week);

// Get every question — the admin panel lists them all.
exports.getAllQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({
            include: [{ model: League, as: 'League', attributes: ['id', 'name'] }],
            // Uncorrected first. Nothing can work out the right answer on its own —
            // the site cannot know whether there was a pentakill — so a question left
            // unsettled pays nobody and says nothing about it. Floating them to the
            // top of the panel is the whole safety net.
            order: [
                [sequelize.literal('closed_at IS NULL'), 'DESC'],
                ['league_id', 'DESC'],
                ['week', 'DESC'],
                ['id', 'ASC']
            ]
        });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get one question
exports.getQuestionById = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }
        res.json(question);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * The questions of one league week, each with this user's own answer if they sent
 * one. This is what the Preguntas tab reads.
 */
exports.getQuestionsByWeek = async (req, res) => {
    const { league_id, week } = req.params;
    try {
        const user = await currentUser(req);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const questions = await Question.findAll({
            where: { league_id, week },
            order: [['id', 'ASC']]
        });

        if (questions.length === 0) return res.json([]);

        const answers = await QuestionAnswer.findAll({
            where: {
                question_id: { [Op.in]: questions.map(q => q.id) },
                user_id: user.id
            }
        });

        const mine = {};
        answers.forEach(a => { mine[a.question_id] = a; });

        res.json(questions.map(q => ({
            ...q.dataValues,
            settled: isSettled(q),
            myAnswer: mine[q.id] ? mine[q.id].answer : null,
            myPoints: mine[q.id] ? mine[q.id].points : null,
            // null = sin responder o sin corregir.
            myCorrect: mine[q.id] ? isAnswerCorrect(q, mine[q.id].answer) : null
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Everyone's answers for one league week. This is what the Inicio reads to show what
 * each person put.
 */
exports.getAnswersByWeek = async (req, res) => {
    const { league_id, week } = req.params;
    try {
        const questions = await Question.findAll({
            where: { league_id, week },
            order: [['id', 'ASC']]
        });

        if (questions.length === 0) return res.json([]);

        const answers = await QuestionAnswer.findAll({
            where: { question_id: { [Op.in]: questions.map(q => q.id) } },
            attributes: ['id', 'question_id', 'user_id', 'answer', 'points']
        });

        const byId = {};
        questions.forEach(q => { byId[q.id] = q; });

        // `correct` lo calcula el servidor: en las de texto el cliente no tiene cómo
        // saber que «faker!!» cuenta como «Faker».
        res.json(answers.map(a => ({
            ...a.dataValues,
            correct: isAnswerCorrect(byId[a.question_id], a.answer)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Deja `week` y `round_id` de acuerdo: si llega la jornada, la semana es su orden;
 * si llega la semana, la jornada es la de ese orden. Mientras dure el paso a
 * jornadas, las dos tienen que decir lo mismo. Modifica `payload`.
 *
 * @param {Object} payload
 * @param {Object} [current] - La pregunta antes del cambio, al editar.
 * @returns {Promise<string|null>} Un error, o null.
 */
const syncRound = async (payload, current = null) => {
    const leagueId = Number(payload.league_id ?? (current && current.league_id));
    const roundChanged = payload.round_id && (!current || Number(payload.round_id) !== current.round_id);
    const weekChanged = payload.week !== undefined && payload.week !== null && payload.week !== ''
        && (!current || Number(payload.week) !== current.week);

    if (roundChanged) {
        const round = await Round.findByPk(payload.round_id);
        if (!round || round.league_id !== leagueId) return 'Esa jornada no es de la liga de la pregunta';
        payload.week = round.order;
    } else if (weekChanged || (!current && leagueId && payload.week !== undefined)) {
        payload.round_id = (await roundFor(leagueId, Number(payload.week))).id;
    } else if (current && payload.league_id !== undefined && leagueId !== current.league_id) {
        payload.round_id = (await roundFor(leagueId, Number(payload.week ?? current.week))).id;
    }
    return null;
};

/**
 * Lo que tiene que cumplir una pregunta según su tipo. Devuelve el error o null.
 *
 * @param {Object} q - La pregunta tal como quedaría.
 * @returns {string|null}
 */
const shapeError = (q) => {
    const type = q.answer_type || ANSWER_TYPES.CHOICE;
    if (!Object.values(ANSWER_TYPES).includes(type)) return `Tipo de pregunta desconocido: "${type}"`;
    if (type === ANSWER_TYPES.CHOICE) {
        if (!Array.isArray(q.options) || q.options.length < 2) return 'Una pregunta de opciones necesita al menos dos';
        if (q.correct_option && !q.options.includes(q.correct_option)) {
            return `"${q.correct_option}" no es una de las opciones de esta pregunta`;
        }
    }
    if (type === ANSWER_TYPES.TEXT && q.correct_option) {
        return 'Las preguntas de texto se corrigen desde «Corregir respuestas», no con una opción';
    }
    return null;
};

// Create question
exports.createQuestion = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.answer_type === ANSWER_TYPES.TEXT) payload.options = [];

        const error = shapeError(payload) || await syncRound(payload);
        if (error) return res.status(400).json({ error });

        // Creada ya corregida (se puede, desde el panel): que conste como cerrada,
        // porque `closed_at` es lo que se mira para saberlo.
        if (payload.correct_option) payload.closed_at = new Date();

        const question = await Question.create(payload);
        if (question.correct_option) await applyPoints(question.league_id, question.week);
        res.status(201).json(question);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Update a question — both editing the wording and marking the right answer.
 *
 * Whenever `correct_option` moves in any direction the week is handed to the
 * aggregator: setting it pays the points out, changing it moves them by the
 * difference, and clearing it takes them back out. All three go through the same
 * call, which is what makes a mistake here recoverable.
 */
exports.updateQuestion = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const before = question.correct_option;
        const payload = { ...req.body };
        // El reparto de las de texto va por settleTextQuestion, no por aquí.
        delete payload.accepted_answers;
        delete payload.closed_at;
        if ((payload.answer_type || question.answer_type) === ANSWER_TYPES.TEXT) payload.options = [];

        // An option that is not on the list would settle the question as wrong for
        // everyone, silently. Far better to refuse it.
        const error = shapeError({ ...question.dataValues, ...payload }) || await syncRound(payload, question);
        if (error) return res.status(400).json({ error });

        // closed_at follows correct_option rather than being set by the caller, so
        // the two can never disagree about whether the question is settled.
        if ('correct_option' in payload && payload.correct_option !== before) {
            payload.closed_at = payload.correct_option ? new Date() : null;
        }

        const updated = await question.update(payload);

        if (updated.correct_option !== before) {
            await applyPoints(updated.league_id, updated.week);
        }

        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

/**
 * Delete a question.
 *
 * The answers go with it, so a settled question has to give its points back BEFORE
 * the rows disappear. The aggregator moves the standings by comparing what each
 * answer is worth now against what it was worth last time, and it can only do that
 * while the answers still exist — delete first and the points stay in the standings
 * with nothing left to explain them.
 */
exports.deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) {
            return res.status(404).json({ error: 'Question not found' });
        }

        const { league_id, week } = question;

        if (isSettled(question)) {
            await question.update({ correct_option: null, accepted_answers: [], closed_at: null });
            await applyPoints(league_id, week);
        }

        await question.destroy();

        // The week's stats still count this question; rewrite them without it.
        await applyPoints(league_id, week);

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Send the week's answers, all at once.
 *
 * Body: { answers: [{ question_id, answer }, …] }
 *
 * All or nothing: one bad answer and none of them are stored. Half a submitted week
 * would be worse than a rejected one, because there is no way to finish it — answers
 * cannot be changed or added to afterwards.
 */
exports.answerQuestions = async (req, res) => {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'No hay respuestas que enviar' });
    }

    try {
        const user = await currentUser(req);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const questionIds = answers.map(a => a.question_id);
        const questions = await Question.findAll({ where: { id: { [Op.in]: questionIds } } });
        const byId = {};
        questions.forEach(q => { byId[q.id] = q; });

        for (const { question_id, answer } of answers) {
            const question = byId[question_id];

            if (!question) {
                return res.status(404).json({ error: `La pregunta ${question_id} no existe` });
            }
            // Without this, anyone with the console open could answer on Monday the
            // question that was settled on Sunday.
            if (isSettled(question)) {
                return res.status(409).json({ error: 'Esta pregunta ya está corregida' });
            }
            if (question.answer_type === ANSWER_TYPES.TEXT) {
                const text = typeof answer === 'string' ? answer.trim() : '';
                if (!normalizeAnswer(text)) {
                    return res.status(400).json({ error: 'Escribe una respuesta' });
                }
                if (text.length > TEXT_ANSWER_MAX) {
                    return res.status(400).json({ error: `Las respuestas tienen un máximo de ${TEXT_ANSWER_MAX} caracteres` });
                }
            } else if (!question.options.includes(answer)) {
                return res.status(400).json({ error: `"${answer}" no es una opción válida` });
            }
        }

        const existing = await QuestionAnswer.count({
            where: { question_id: { [Op.in]: questionIds }, user_id: user.id }
        });
        if (existing > 0) {
            return res.status(409).json({ error: 'Ya has respondido a estas preguntas' });
        }

        const created = await sequelize.transaction(async (transaction) =>
            QuestionAnswer.bulkCreate(
                // Se guarda lo que escribió, recortado. La versión normalizada no se
                // guarda: se calcula al comparar, así nunca se desfasa.
                answers.map(a => ({
                    question_id: a.question_id,
                    user_id: user.id,
                    answer: typeof a.answer === 'string' ? a.answer.trim() : a.answer
                })),
                { transaction }
            )
        );

        res.status(201).json(created);
    } catch (error) {
        // The unique index is the last word: two submits landing at the same instant
        // get past the count above, and one of them ends here.
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Ya has respondido a estas preguntas' });
        }
        res.status(400).json({ error: error.message });
    }
};

/**
 * Distancia de edición entre dos textos: cuántas letras hay que cambiar, añadir o
 * quitar para pasar de uno a otro. Solo sirve para sugerir parecidos al corregir.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
const editDistance = (a, b) => {
    const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
        let diag = prev[0];
        prev[0] = i;
        for (let j = 1; j <= b.length; j++) {
            const keep = prev[j];
            prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
            diag = keep;
        }
    }
    return prev[b.length];
};

/**
 * Las respuestas de una pregunta de texto, agrupadas para corregirlas de un vistazo.
 *
 * Un grupo es todo lo que se normaliza igual: «Faker», «FAKER» y «faker!!» son uno.
 * Cada grupo dice cómo lo escribió la mayoría, cuántos y quiénes, si ya está
 * aceptado, y si se parece (a una letra) a otro grupo mayor o ya aceptado: eso es
 * casi siempre una falta de ortografía, pero lo decide el admin, no la web.
 *
 * GET /questions/groups/:id → { question, groups: [...] }
 */
exports.getAnswerGroups = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id, {
            include: [{ model: League, as: 'League', attributes: ['id', 'name'] }]
        });
        if (!question) return res.status(404).json({ error: 'Question not found' });

        const answers = await QuestionAnswer.findAll({
            where: { question_id: question.id },
            include: [{ model: User, as: 'User', attributes: ['id', 'username'] }],
            order: [['id', 'ASC']]
        });

        const accepted = new Set((question.accepted_answers || []).map(normalizeAnswer));
        const byKey = new Map();
        for (const a of answers) {
            const key = normalizeAnswer(a.answer);
            const g = byKey.get(key) || { key, spellings: new Map(), users: [] };
            g.spellings.set(a.answer, (g.spellings.get(a.answer) || 0) + 1);
            g.users.push(a.User ? a.User.username : `#${a.user_id}`);
            byKey.set(key, g);
        }

        const groups = [...byKey.values()].map(g => {
            const spellings = [...g.spellings.entries()].sort((x, y) => y[1] - x[1]);
            return {
                key: g.key,
                label: spellings[0][0],
                variants: spellings.map(([text]) => text),
                count: g.users.length,
                users: g.users,
                accepted: accepted.has(g.key),
            };
        }).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

        for (const g of groups) {
            if (g.accepted || g.key.length < 3) continue;
            const near = groups.find(o => o !== g && (o.accepted || o.count > g.count) && editDistance(o.key, g.key) <= 1);
            if (near) g.similarTo = near.label;
        }

        res.json({ question, groups });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * Corrige una pregunta de texto: estas respuestas valen, las demás no.
 *
 * Body: { accepted_answers: ["Faker", "Lee Sang-hyeok"] } — cierra la pregunta. Una
 * lista vacía también la cierra: «nadie la acertó» es una corrección válida.
 * Body: { reopen: true } — la vuelve a abrir y devuelve los puntos.
 *
 * Igual que con las de opciones, los puntos los mueve el agregador por diferencia:
 * aceptar una respuesta más mañana suma solo a quien la escribió.
 */
exports.settleTextQuestion = async (req, res) => {
    try {
        const question = await Question.findByPk(req.params.id);
        if (!question) return res.status(404).json({ error: 'Question not found' });
        if (question.answer_type !== ANSWER_TYPES.TEXT) {
            return res.status(400).json({ error: 'Esta pregunta es de opciones: se corrige eligiendo la opción correcta' });
        }

        if (req.body.reopen) {
            await question.update({ accepted_answers: [], closed_at: null });
        } else {
            const list = req.body.accepted_answers;
            if (!Array.isArray(list) || list.some(t => typeof t !== 'string')) {
                return res.status(400).json({ error: 'accepted_answers tiene que ser una lista de textos' });
            }
            // Sin repetidos ni vacíos, comparando como se compara al puntuar.
            const seen = new Set();
            const clean = [];
            for (const text of list.map(t => t.trim())) {
                const key = normalizeAnswer(text);
                if (!key || seen.has(key)) continue;
                seen.add(key);
                clean.push(text);
            }
            await question.update({ accepted_answers: clean, closed_at: question.closed_at || new Date() });
        }

        await applyPoints(question.league_id, question.week);
        res.json(question);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};
