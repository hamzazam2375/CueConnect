import Income from "../models/income.js";

export const SOURCE_TYPES = ["frame", "century", "tournament", "other"];

export const SOURCE_LABELS = {
    frame: "Frame Games",
    century: "Century Games",
    tournament: "Tournament Fees",
    other: "Other Income"
};

export const EXPENSE_LABELS = {
    rent: "Rent",
    utilities: "Utilities",
    equipment: "Equipment",
    salary: "Salary",
    maintenance: "Maintenance",
    other: "Other"
};

const categoryFromSource = (sourceType) => ({
    frame: "game",
    century: "game",
    tournament: "event",
    other: "other"
}[sourceType] || "other");

export const sourceTypeFromRecord = (income) => {
    if (income.sourceType && SOURCE_TYPES.includes(income.sourceType) && income.sourceType !== "other") return income.sourceType;
    if (income.category === "event") return "tournament";
    if (SOURCE_TYPES.includes(income.sourceType)) return income.sourceType;
    return "other";
};

export const collectedIncomeMatch = (branchId, start, end) => ({
    branchId,
    date: { $gte: start, $lte: end },
    category: { $ne: "booking" },
    sourceType: { $nin: ["booking"] },
    status: { $ne: "refunded" }
});

export const sourceTypeFromGames = (games = []) => {
    const types = [...new Set(games.map((game) => game?.type).filter(Boolean))];
    if (types.length === 1 && types[0] === "frame") return "frame";
    if (types.length === 1 && types[0] === "century") return "century";
    return "other";
};

export const recordReceivedIncome = async ({
    branchId,
    paymentId,
    amount,
    method,
    sourceType,
    description,
    source,
    notes,
    date
}) => {
    if (!(Number(amount) > 0)) return null;
    if (paymentId) {
        const existing = await Income.findOne({ paymentId });
        if (existing) return existing;
    }

    const type = SOURCE_TYPES.includes(sourceType) ? sourceType : "other";
    const label = description || source || "Received payment";

    try {
        return await Income.create({
            branchId,
            paymentId: paymentId || null,
            amount: Number(amount),
            paymentMethod: method || null,
            sourceType: type,
            category: categoryFromSource(type),
            description: label,
            source: source || label,
            notes: notes || null,
            status: "completed",
            date: date || new Date()
        });
    } catch (error) {
        if (error.code === 11000 && paymentId) {
            return Income.findOne({ paymentId });
        }
        throw error;
    }
};
