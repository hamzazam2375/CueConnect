import api from "../services/api";

// resolves to { summary, games, payments, activity }
export const fetchClientHistory = async () => {
    const { data } = await api.get("/client/history");
    return data;
};
