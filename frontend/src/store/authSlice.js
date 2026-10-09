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

// client login
export const clientLogin = createAsyncThunk(
    "auth/clientLogin",
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/client/login", { email, password });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Login failed");
        }
    }
);

// client signup
export const clientSignup = createAsyncThunk(
    "auth/clientSignup",
    async ({ firstName, lastName, email, password }, { rejectWithValue }) => {
        try {
            const { data } = await api.post("/auth/client/register", {
                firstName,
                lastName,
                email,
                password
            });
            return data;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Registration failed");
        }
    }
);

// restore the cookie-based session after refresh
export const fetchCurrentUser = createAsyncThunk(
    "auth/fetchCurrentUser",
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get("/auth/me");
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Session unavailable");
        }
    }
);

export const updateClientProfile = createAsyncThunk(
    "auth/updateClientProfile",
    async ({ firstName, lastName, phone }, { rejectWithValue }) => {
        try {
            const { data } = await api.patch("/auth/client/profile", { firstName, lastName, phone });
            return data.user;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Profile update failed");
        }
    }
);

export const changeClientPassword = createAsyncThunk(
    "auth/changeClientPassword",
    async ({ currentPassword, newPassword }, { rejectWithValue }) => {
        try {
            const { data } = await api.patch("/auth/client/password", { currentPassword, newPassword });
            return data.message;
        } catch (err) {
            return rejectWithValue(err.response?.data?.message || "Password change failed");
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
        isInitializing: true,
        isLoading: false,
        isUpdatingProfile: false,
        isChangingPassword: false,
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
            // ── restore session ──
            .addCase(fetchCurrentUser.fulfilled, (state, action) => {
                state.isInitializing = false;
                state.user = action.payload;
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                state.isInitializing = false;
                state.user = null;
            })

            // ── client login ──
            .addCase(clientLogin.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(clientLogin.fulfilled, (state, action) => {
                state.isLoading = false;
                state.user = action.payload;
            })
            .addCase(clientLogin.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── client signup ──
            .addCase(clientSignup.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(clientSignup.fulfilled, (state) => {
                state.isLoading = false;
            })
            .addCase(clientSignup.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            })

            // ── admin login ──
            .addCase(updateClientProfile.pending, (state) => {
                state.isUpdatingProfile = true;
            })
            .addCase(updateClientProfile.fulfilled, (state, action) => {
                state.isUpdatingProfile = false;
                state.user = action.payload;
            })
            .addCase(updateClientProfile.rejected, (state) => {
                state.isUpdatingProfile = false;
            })
            .addCase(changeClientPassword.pending, (state) => {
                state.isChangingPassword = true;
            })
            .addCase(changeClientPassword.fulfilled, (state) => {
                state.isChangingPassword = false;
            })
            .addCase(changeClientPassword.rejected, (state) => {
                state.isChangingPassword = false;
            })

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
            .addCase(logout.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(logout.fulfilled, (state) => {
                state.isLoading = false;
                state.user = null;
                state.tempToken = null;
                state.error = null;
            })
            .addCase(logout.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    }
});

export const { clearError, clearTempToken } = authSlice.actions;
export default authSlice.reducer;
