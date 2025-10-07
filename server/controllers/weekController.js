const startOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const offset = (day + 6) % 7;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - offset);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
};

const endOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const offset = (day + 6) % 7;
    const endOfWeek = new Date(date);
    endOfWeek.setDate(date.getDate() + 7 - offset);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
};


module.exports = {
    startOfWeek,
    endOfWeek
}
