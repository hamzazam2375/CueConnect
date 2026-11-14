import Income from "../models/income.js";
import Expense from "../models/expense.js";
import Bill from "../models/bill.js";
import { rangeBounds, monthBounds, formatDayKey, formatMonthKey } from "../utils/dateRange.js";
import { collectedIncomeMatch, SOURCE_LABELS, SOURCE_TYPES, EXPENSE_LABELS, sourceTypeFromRecord } from "../utils/recordIncome.js";
import { roundMoney } from "../utils/billMath.js";
import { buildReportPdf } from "../utils/receiptPdf.js";

const EXPENSE_CATEGORIES = Object.keys(EXPENSE_LABELS);
const METHODS = ["cash", "online", "card"];
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const money = (value) => roundMoney(value);
const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
const formatDate = (value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const boundsFromQuery = (query) => {
    if (query.range === "custom" || query.from || query.to) {
        return rangeBounds("custom", query.from, query.to);
    }
    if (query.range) return rangeBounds(query.range);
    if (query.date) return rangeBounds("custom", query.date, query.date);
    if (query.month) return monthBounds(query.month);
    return rangeBounds("month");
};

const normalizeReportType = (type) => {
    if (type === "income" || type === "expense") return type;
    return "summary";
};

const summaryTitle = (range) => {
    if (range === "today") return "Daily Financial Report";
    if (range === "month") return "Monthly Financial Report";
    return "Financial Report";
};

const serializeIncome = (income) => {
    const sourceType = sourceTypeFromRecord(income);
    return {
        id: String(income._id),
        description: income.description || income.source || income.notes || "Received payment",
        source: sourceType,
        sourceLabel: SOURCE_LABELS[sourceType],
        amount: income.amount,
        paymentMethod: income.paymentMethod || null,
        date: income.date,
        status: income.status === "refunded" ? "refunded" : "completed"
    };
};

const serializeExpense = (expense) => ({
    id: String(expense._id),
    description: expense.description,
    category: expense.category,
    categoryLabel: EXPENSE_LABELS[expense.category] || expense.category,
    amount: expense.amount,
    paymentMethod: expense.paymentMethod || null,
    date: expense.date,
    recordedBy: expense.recordedBy
        ? `${expense.recordedBy.firstName || ""} ${expense.recordedBy.lastName || ""}`.trim()
        : "—"
});

const sumField = async (Model, match, field = "amount") => {
    const result = await Model.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: `$${field}` } } }
    ]);
    return money(result[0]?.total || 0);
};

const groupBy = async (Model, match, key) => {
    const rows = await Model.aggregate([
        { $match: match },
        { $group: { _id: `$${key}`, total: { $sum: "$amount" } } }
    ]);
    return rows.map((row) => ({ key: row._id, amount: money(row.total) }));
};

const analyticsSeries = async (branchId, start, end) => {
    const span = end.getTime() - start.getTime();
    const useMonths = span > 45 * 24 * 60 * 60 * 1000;
    const keyFn = useMonths ? formatMonthKey : formatDayKey;
    const [incomes, expenses] = await Promise.all([
        Income.find(collectedIncomeMatch(branchId, start, end)).select("amount date").lean(),
        Expense.find({ branchId, date: { $gte: start, $lte: end } }).select("amount date").lean()
    ]);

    const map = new Map();
    const add = (date, field, amount) => {
        const key = keyFn(date);
        if (!map.has(key)) map.set(key, { label: key, revenue: 0, expenses: 0 });
        map.get(key)[field] += amount;
    };
    incomes.forEach((item) => add(item.date, "revenue", Number(item.amount || 0)));
    expenses.forEach((item) => add(item.date, "expenses", Number(item.amount || 0)));

    return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([, value]) => ({ ...value, revenue: money(value.revenue), expenses: money(value.expenses) }));
};

const buildOverview = async (branchId, start, end) => {
    const [revenue, expenses, pending] = await Promise.all([
        sumField(Income, collectedIncomeMatch(branchId, start, end)),
        sumField(Expense, { branchId, date: { $gte: start, $lte: end } }),
        sumField(Bill, {
            branchId,
            status: { $in: ["pending", "partial"] },
            createdAt: { $gte: start, $lte: end }
        }, "remainingBalance")
    ]);
    return {
        revenue,
        expenses,
        netProfit: money(revenue - expenses),
        pendingPayments: pending
    };
};

export const getFinanceOverview = async (req, res) => {
    try {
        const { start, end } = boundsFromQuery(req.query);
        const branchId = req.user.branchId;
        const incomeMatch = collectedIncomeMatch(branchId, start, end);
        const expenseMatch = { branchId, date: { $gte: start, $lte: end } };

        const [overview, series, incomeGroups, expenseGroups] = await Promise.all([
            buildOverview(branchId, start, end),
            analyticsSeries(branchId, start, end),
            groupBy(Income, incomeMatch, "sourceType"),
            groupBy(Expense, expenseMatch, "category")
        ]);

        const incomeTotals = {};
        incomeGroups.forEach((row) => {
            const key = SOURCE_TYPES.includes(row.key) ? row.key : "other";
            incomeTotals[key] = money((incomeTotals[key] || 0) + row.amount);
        });
        const incomeBySource = SOURCE_TYPES.map((source) => ({
            source,
            label: SOURCE_LABELS[source],
            amount: incomeTotals[source] || 0
        }));

        const expensesByCategory = EXPENSE_CATEGORIES.map((category) => ({
            category,
            label: EXPENSE_LABELS[category],
            amount: expenseGroups.find((row) => row.key === category)?.amount || 0
        }));

        res.status(200).json({
            range: { start, end },
            overview,
            analytics: { series, incomeBySource, expensesByCategory }
        });
    } catch (error) {
        console.error("Finance overview error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listFinanceIncome = async (req, res) => {
    try {
        const { start, end } = boundsFromQuery(req.query);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const search = String(req.query.search || "").trim();
        const filter = {
            ...collectedIncomeMatch(req.user.branchId, start, end)
        };
        const extra = [];
        if (SOURCE_TYPES.includes(req.query.source)) {
            extra.push(req.query.source === "tournament"
                ? { $or: [{ sourceType: "tournament" }, { category: "event" }] }
                : { sourceType: req.query.source });
        }
        if (METHODS.includes(req.query.method)) filter.paymentMethod = req.query.method;
        if (req.query.status === "refunded" || req.query.status === "completed") filter.status = req.query.status;
        if (search) {
            const rx = new RegExp(escapeRegex(search), "i");
            extra.push({ $or: [{ description: rx }, { source: rx }, { notes: rx }] });
        }
        if (extra.length) filter.$and = extra;

        const [total, rows] = await Promise.all([
            Income.countDocuments(filter),
            Income.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).lean()
        ]);

        res.status(200).json({
            income: rows.map(serializeIncome),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit))
        });
    } catch (error) {
        console.error("List finance income error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const listFinanceExpenses = async (req, res) => {
    try {
        const { start, end } = boundsFromQuery(req.query);
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
        const search = String(req.query.search || "").trim();
        const filter = { branchId: req.user.branchId, date: { $gte: start, $lte: end } };
        if (EXPENSE_CATEGORIES.includes(req.query.category)) filter.category = req.query.category;
        if (search) {
            const rx = new RegExp(escapeRegex(search), "i");
            filter.$or = [{ description: rx }, { notes: rx }];
        }

        const [total, rows] = await Promise.all([
            Expense.countDocuments(filter),
            Expense.find(filter).sort({ date: -1 }).skip((page - 1) * limit).limit(limit).populate("recordedBy", "firstName lastName").lean()
        ]);

        res.status(200).json({
            expenses: rows.map(serializeExpense),
            total,
            page,
            pages: Math.max(1, Math.ceil(total / limit))
        });
    } catch (error) {
        console.error("List finance expenses error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const createExpense = async (req, res) => {
    try {
        const { description, category, amount, paymentMethod, date, notes } = req.body;
        const value = Number(amount);
        if (!String(description || "").trim()) {
            return res.status(400).json({ message: "Expense description is required" });
        }
        if (!EXPENSE_CATEGORIES.includes(category)) {
            return res.status(400).json({ message: "Select a valid expense category" });
        }
        if (!(value > 0)) {
            return res.status(400).json({ message: "Amount must be greater than 0" });
        }
        if (!METHODS.includes(paymentMethod)) {
            return res.status(400).json({ message: "Payment method must be cash, online, or card" });
        }
        // a plain YYYY-MM-DD is stored at local midday so it stays on that calendar day in every report
        const expenseDate = !date
            ? new Date()
            : /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? new Date(`${date}T12:00:00`) : new Date(date);
        if (Number.isNaN(expenseDate.getTime())) {
            return res.status(400).json({ message: "Enter a valid expense date" });
        }
        if (expenseDate > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
            return res.status(400).json({ message: "Expense date cannot be in the future" });
        }

        const expense = await Expense.create({
            branchId: req.user.branchId,
            description: String(description).trim(),
            category,
            amount: value,
            paymentMethod,
            date: expenseDate,
            notes: notes ? String(notes).trim() : null,
            recordedBy: req.user._id
        });

        res.status(201).json({
            message: "Expense recorded",
            expense: serializeExpense(await expense.populate("recordedBy", "firstName lastName"))
        });
    } catch (error) {
        console.error("Create expense error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, branchId: req.user.branchId });
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        res.status(200).json({ message: "Expense deleted" });
    } catch (error) {
        console.error("Delete expense error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

const reportLines = async (req) => {
    const type = normalizeReportType(req.query.type);
    const { start, end } = boundsFromQuery(req.query);
    const branchId = req.user.branchId;
    const overview = await buildOverview(branchId, start, end);
    const period = `${formatDate(start)} – ${formatDate(end)}`;
    const title = type === "income"
        ? "Income Report"
        : type === "expense"
            ? "Expense Report"
            : summaryTitle(req.query.range);
    const lines = [title, period, ""];

    if (type === "income") {
        const rows = await Income.find(collectedIncomeMatch(branchId, start, end)).sort({ date: -1 }).lean();
        lines.push(`Total collected revenue: ${formatMoney(overview.revenue)}`, "");
        rows.forEach((row) => {
            const item = serializeIncome(row);
            lines.push(`${formatDate(item.date)}  ${item.sourceLabel}  ${formatMoney(item.amount)}  ${item.paymentMethod || "—"}  ${item.status}`);
            lines.push(`  ${item.description}`);
        });
        if (!rows.length) lines.push("No income records in this period.");
    } else if (type === "expense") {
        const rows = await Expense.find({ branchId, date: { $gte: start, $lte: end } }).sort({ date: -1 }).populate("recordedBy", "firstName lastName").lean();
        lines.push(`Total expenses: ${formatMoney(overview.expenses)}`, "");
        rows.forEach((row) => {
            const item = serializeExpense(row);
            lines.push(`${formatDate(item.date)}  ${item.categoryLabel}  ${formatMoney(item.amount)}  ${item.paymentMethod || "—"}`);
            lines.push(`  ${item.description}  ·  ${item.recordedBy}`);
        });
        if (!rows.length) lines.push("No expense records in this period.");
    } else {
        const incomeGroups = await groupBy(Income, collectedIncomeMatch(branchId, start, end), "sourceType");
        const expenseGroups = await groupBy(Expense, { branchId, date: { $gte: start, $lte: end } }, "category");
        lines.push(
            `Total revenue (collected): ${formatMoney(overview.revenue)}`,
            `Total expenses: ${formatMoney(overview.expenses)}`,
            `Net profit: ${formatMoney(overview.netProfit)}`,
            `Pending payments: ${formatMoney(overview.pendingPayments)}`,
            "",
            "Income by source"
        );
        SOURCE_TYPES.forEach((source) => {
            const amount = incomeGroups.find((row) => row.key === source)?.amount || 0;
            lines.push(`  ${SOURCE_LABELS[source]}: ${formatMoney(amount)}`);
        });
        lines.push("", "Expenses by category");
        EXPENSE_CATEGORIES.forEach((category) => {
            const amount = expenseGroups.find((row) => row.key === category)?.amount || 0;
            lines.push(`  ${EXPENSE_LABELS[category]}: ${formatMoney(amount)}`);
        });
    }

    return { title, period, overview, lines, start, end, type };
};

export const previewFinanceReport = async (req, res) => {
    try {
        const allowed = ["summary", "daily", "monthly", "income", "expense"];
        if (!allowed.includes(req.query.type || "summary")) {
            return res.status(400).json({ message: "Report type must be summary, income, or expense" });
        }
        const report = await reportLines(req);
        res.status(200).json({
            title: report.title,
            period: report.period,
            overview: report.overview,
            lines: report.lines
        });
    } catch (error) {
        console.error("Preview finance report error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

export const downloadFinanceReport = async (req, res) => {
    try {
        const allowed = ["summary", "daily", "monthly", "income", "expense"];
        if (!allowed.includes(req.query.type || "summary")) {
            return res.status(400).json({ message: "Report type must be summary, income, or expense" });
        }
        const report = await reportLines(req);
        const pdf = await buildReportPdf(report.title, report.lines.slice(1));
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${report.type}-report.pdf"`);
        res.send(pdf);
    } catch (error) {
        console.error("Download finance report error:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};
