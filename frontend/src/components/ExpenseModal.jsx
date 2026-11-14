import { useState } from "react";
import { ModalShell, inputClass, labelClass } from "./StartGameModal";
import api from "../services/api";
import { EXPENSE_CATEGORIES, apiError, localDateKey } from "../utils/adminFormat";


const emptyExpense = () => ({ description: "", category: "other", amount: "", paymentMethod: "cash", date: localDateKey(), notes: "" });

// records a branch expense; rendered only while open so the form starts fresh each time
export default function ExpenseModal({ onClose, onSaved }) {
    const [form, setForm] = useState(emptyExpense);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

    const submit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const { data } = await api.post("/admin/expenses", { ...form, amount: Number(form.amount) });
            onSaved?.(data.expense);
            onClose();
        } catch (requestError) {
            setError(apiError(requestError, "Expense could not be recorded"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalShell title="Add expense" onClose={onClose}>
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <label htmlFor="expense-description" className={labelClass}>Description</label>
                    <input id="expense-description" required maxLength={120} value={form.description} onChange={update("description")} placeholder="e.g. Cue tips and chalk" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="expense-category" className={labelClass}>Category</label>
                        <select id="expense-category" value={form.category} onChange={update("category")} className={`${inputClass} appearance-none`}>
                            {EXPENSE_CATEGORIES.map((item) => <option key={item.value} value={item.value} className="bg-neutral-900">{item.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="expense-amount" className={labelClass}>Amount (Rs.)</label>
                        <input id="expense-amount" required type="number" min="1" step="any" value={form.amount} onChange={update("amount")} className={inputClass} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label htmlFor="expense-method" className={labelClass}>Payment method</label>
                        <select id="expense-method" value={form.paymentMethod} onChange={update("paymentMethod")} className={`${inputClass} appearance-none`}>
                            <option value="cash" className="bg-neutral-900">Cash</option>
                            <option value="online" className="bg-neutral-900">Online</option>
                            <option value="card" className="bg-neutral-900">Card</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="expense-date" className={labelClass}>Date</label>
                        <input id="expense-date" required type="date" max={localDateKey()} value={form.date} onChange={update("date")} className={`${inputClass} admin-date-field`} />
                    </div>
                </div>
                <div>
                    <label htmlFor="expense-notes" className={labelClass}>Notes (optional)</label>
                    <input id="expense-notes" maxLength={300} value={form.notes} onChange={update("notes")} className={inputClass} />
                </div>
                {error && <p className="rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-400" role="alert">{error}</p>}
                <div className="flex gap-3 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/[0.05]">Cancel</button>
                    <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold hover:bg-red-500 disabled:bg-red-900">{saving ? "Saving..." : "Save expense"}</button>
                </div>
            </form>
        </ModalShell>
    );
}
