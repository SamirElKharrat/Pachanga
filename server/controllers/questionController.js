const { Op } = require('sequelize');
const sequelize = require('../config/configdb');
const Question = require('../models/question');
const QuestionAnswer = require('../models/questionAnswer');
const League = require('../models/league');
const User = require('../models/user');
const statsAggregator = require('../utils/statsAggregator');

/**
 * The weekly questions.
 *
 * Two things in here are worth reading before changing anything:
 *
 *  - Answers are final. Nothing in this file updates one, and the unique index on
 *    (question_id, user_id) makes sure nothing else can either.
 *
 *  - Points are never touched directly. Setting `correct_option` hands the week to
 *    statsAggregator.applyWeekPoints, exactly like entering a result does. Adding
 *    points to LeagueParticipation from here would make them show up in the stats
 *    screens as "added by hand" — see the comment on points_manual.
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
                [sequelize.literal('correct_option IS NULL'), 'DESC'],
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
            myAnswer: mine[q.id] ? mine[q.id].answer : null,
            myPoints: mine[q.id] ? mine[q.id].points : null
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
            attributes: ['id'],
            order: [['id', 'ASC']]
        });

        if (questions.length === 0) return res.json([]);

        const answers = await QuestionAnswer.findAll({
            where: { question_id: { [Op.in]: questions.map(q => q.id) } },
            attributes: ['id', 'question_id', 'user_id', 'answer', 'points']
        });

        res.json(answers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create question
exports.createQuestion = async (req, res) => {
    try {
        const question = await Question.create(req.body);
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

        // An option that is not on the list would settle the question as wrong for
        // everyone, silently. Far better to refuse it.
        const options = payload.options || question.options || [];
        if (payload.correct_option && !options.includes(payload.correct_option)) {
            return res.status(400).json({
                error: `"${payload.correct_option}" no es una de las opciones de esta pregunta`
            });
        }

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

        if (question.correct_option) {
            await question.update({ correct_option: null, closed_at: null });
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
            if (question.correct_option) {
                return res.status(409).json({ error: 'Esta pregunta ya está corregida' });
            }
            if (!question.options.includes(answer)) {
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
                answers.map(a => ({ question_id: a.question_id, user_id: user.id, answer: a.answer })),
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
