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

// admin signup — step 1: verify secret key → sends OTP to email
export const verifyAdminKey = createAsyncThunk(
    "auth/verifyAdminKey",
    async ({ email, password, secretKey }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/verify-key", { email, password, secretKey });
            return data; // { message, email }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Verification failed");
        }
    }
);

// admin signup — step 1b: verify the OTP → get tempToken
export const verifyOtp = createAsyncThunk(
    "auth/verifyOtp",
    async ({ email, otp }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/verify-otp", { email, otp });
            return data; // { message, tempToken }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "OTP verification failed");
        }
    }
);

// resend OTP
export const resendOtp = createAsyncThunk(
    "auth/resendOtp",
    async ({ email }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/admin/resend-otp", { email });
            return data; // { message }
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Failed to resend code");
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
        tempToken: null,      // used between admin signup step 1b & 2
        pendingEmail: null,   // email awaiting OTP verification
        showOtpModal: false,  // controls OTP overlay visibility
        isLoading: false,
        error: null
    },
    reducers: {
        clearError(state) {
            state.error = null;
        },
        clearTempToken(state) {
            state.tempToken = null;
        },
        closeOtpModal(state) {
            state.showOtpModal = false;
            state.pendingEmail = null;
            state.error = null;
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

            // ── verify admin key (signup step 1) → OTP sent ──
            .addCase(verifyAdminKey.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(verifyAdminKey.fulfilled, (state, action) => {
                state.isLoading = false;
                state.pendingEmail = action.payload.email;
                state.showOtpModal = true;
            })
            .addCase(verifyAdminKey.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── verify OTP (signup step 1b) → get tempToken ──
            .addCase(verifyOtp.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(verifyOtp.fulfilled, (state, action) => {
                state.isLoading = false;
                state.tempToken = action.payload.tempToken;
                state.showOtpModal = false;
                state.pendingEmail = null;
            })
            .addCase(verifyOtp.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── resend OTP ──
            .addCase(resendOtp.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(resendOtp.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(resendOtp.rejected, (state, action) => {
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
                state.pendingEmail = null;
                state.showOtpModal = false;
                state.error = null;
            });
    }
});

export const { clearError, clearTempToken, closeOtpModal } = authSlice.actions;
export default authSlice.reducer;
