
import axiosInstance from "./url.service";

const handleError = (error) => {
  throw error.response?.data || new Error(error.message || "Request failed");
};

export const registerWithPassword = async (username, email, password) => {
  try {
    const response = await axiosInstance.post("/auth/register", {
      username,
      email,
      password
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const loginWithPassword = async (email, password) => {
  try {
    const response = await axiosInstance.post("/auth/login", {
      email,
      password
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const sendOtp = async (phoneNumber, phoneSuffix, email) => {
  try {
    const response = await axiosInstance.post("/auth/send-otp", {
      phoneNumber,
      phoneSuffix,
      email
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const verifyOtp = async (phoneNumber, phoneSuffix, otpString, email) => {
  try {
    const response = await axiosInstance.post("/auth/verify-otp", {
      phoneNumber,
      phoneSuffix,
      otp: otpString,
      email
    });
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const updateUserProfile = async (updateData) => {
  try {
    const response = await axiosInstance.put("/auth/update-profile", updateData);
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const checkUSerAuth = async () => {
  try {
    const response = await axiosInstance.get("/auth/check-auth");
    if (response.data.status === "success") {
      return { isAuthenticated: true, user: response.data.data };
    }
    return { isAuthenticated: false };
  } catch (error) {
    return { isAuthenticated: false };
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/logout");
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};

export const getAllUser = async () => {
  try {
    const response = await axiosInstance.get("/auth/users");
    return response.data;
  } catch (error) {
    return handleError(error);
  }
};
