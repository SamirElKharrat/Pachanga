const startOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const offset = (day + 3) % 7; // Adjusting to Thursday (4)
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - offset);
    startOfWeek.setHours(0, 0, 0, 0);
    return startOfWeek;
};

const endOfWeek = (date = new Date()) => {
    const day = date.getDay();
    const offset = (day + 3) % 7;
    const endOfWeek = new Date(date);
    endOfWeek.setDate(date.getDate() + (7 - offset));
    endOfWeek.setHours(23, 59, 59, 999);
    return endOfWeek;
};


const getLeagueWeekNumber = (leagueStartDate, matchDate) => {
    const startOfLeagueWeek = startOfWeek(new Date(leagueStartDate)).getTime();
    const matchTime = new Date(matchDate).getTime();
    const diffTime = matchTime - startOfLeagueWeek;
    
    // Math.floor of positive days will give the week index (0 for first week, 1 for second week, etc)
    const weekIndex = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return weekIndex + 1; // 1-based index
};

module.exports = {
    startOfWeek,
    endOfWeek,
    getLeagueWeekNumber
}
