exports.validateSchedule = (req, res) => {
    const { newOption, currentOptions } = req.body;
    if (!newOption || !currentOptions || !Array.isArray(currentOptions)) return res.json({ conflict: false });

    for (const current of currentOptions) {
        if (!current) continue;
        
        // ROOT CAUSE FIX: Same Course + Same Type
        if (current.courseCode === newOption.courseCode && current.type === newOption.type) {
            return res.json({ conflict: true, details: { reason: "SAME_COURSE_TYPE" } });
        }

        const newSess = newOption.sessions || [];
        const curSess = current.sessions || [];

        for (const nS of newSess) {
            for (const cS of curSess) {
                if (!nS.day || !cS.day || !nS.periods || !cS.periods || nS.periods.length === 0 || cS.periods.length === 0) continue;
                
                if (nS.day === cS.day) {
                    const overlap = nS.periods.some(p => cS.periods.includes(p));
                    if (overlap) {
                        // ROOT CAUSE FIX: Week Logic
                        if (nS.weekPhase && cS.weekPhase && nS.weekPhase !== "UNKNOWN" && cS.weekPhase !== "UNKNOWN") {
                            if (nS.weekPhase !== cS.weekPhase) {
                                continue; // A vs B -> No conflict
                            }
                        }
                        // A vs A, ho?c UNKNOWN -> Trùng
                        return res.json({ conflict: true, details: { reason: "TIME_OVERLAP" } });
                    }
                }
            }
        }
    }
    return res.json({ conflict: false });
};
