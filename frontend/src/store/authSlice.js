import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../services/api";

// ── async thunks ──

// admin login
export const adminLogin = createAsyncThunk(
    "auth/adminLogin",
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/login", { email, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed");
        }
    }
);

// admin signup — step 1: verify secret key
export const verifyAdminKey = createAsyncThunk(
    "auth/verifyAdminKey",
    async ({ email, password, secretKey }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/verify-key", { email, password, secretKey });
            return data; // { message, tempToken }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Verification failed");
        }
    }
);

// admin signup — step 2: complete registration
export const registerAdmin = createAsyncThunk(
    "auth/registerAdmin",
    async ({ firstName, lastName, tempToken, branchAction, branchName, branchCode }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/register", {
                firstName, lastName, tempToken, branchAction, branchName, branchCode
            });
            return data; // { message, admin, branch }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Registration failed");
        }
    }
);

// logout
export const logout = createAsyncThunk(
    "auth/logout",
    async (_, { rejectWithValue }) => {
        try {
            await api.post("/auth/logout");
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Logout failed");
        }
    }
);

// ── slice ──

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        tempToken: null,      // used between admin signup step 1 & 2
        isLoading: false,
        error: null
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        clearTempToken(state) {
            state.tempToken = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // ── admin login ──
            .addCase(adminLogin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(adminLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(adminLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── verify admin key (signup step 1) ──
            .addCase(verifyAdminKey.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(verifyAdminKey.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tempToken = action.payload.tempToken;
            })
            .addCase(verifyAdminKey.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── register admin (signup step 2) ──
            .addCase(registerAdmin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(registerAdmin.fulfilled, (state) => {
                state.isLoading = false;
                state.tempToken = null;
            })
            .addCase(registerAdmin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── logout ──
            .addCase(logout.fulfilled, (state) => {
                state.user = null;
                state.tempToken = null;
                state.error = null;
            });
    }
});

export const { clearError, clearTempToken } = authSlice.actions;
export default authSlice.reducer;
