const startOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const wedOffset = day >= 3 ? day - 3 : 4 + day;
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - wedOffset);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
}

const endOfWeek = (date = new Date()) => {
    const endOfWeek = new Date(date);
    endOfWeek.setDate(date.getDate() + 1);
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
}

module.exports = {
    startOfWeek,
    endOfWeek
}
