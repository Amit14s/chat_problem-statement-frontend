
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FaRocketchat } from "react-icons/fa6";
import useUserStore from "../../store/useUserStore";
import {
  loginWithPassword,
  registerWithPassword
} from "../../services/user.services";

export default function Login() {
  const navigate = useNavigate();
  const setUser = useUserStore((state) => state.setUser);

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister && username.trim().length < 3) {
      setError("Username must contain at least 3 characters");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const result = isRegister
        ? await registerWithPassword(username.trim(), email.trim(), password)
        : await loginWithPassword(email.trim(), password);

      if (result?.status !== "success") {
        throw new Error(result?.message || "Authentication failed");
      }

      const user =
        result?.data?.user ||
        result?.user ||
        result?.data;

      if (!user || !user._id) {
        throw new Error("Login succeeded, but user data was not returned");
      }

      setUser(user);
      toast.success(isRegister ? "Account created!" : "Welcome back!");
      navigate("/");
    } catch (err) {
      const message =
        err?.message ||
        err?.response?.data?.message ||
        "Something went wrong";
      setError(typeof message === "string" ? message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-400 to-blue-600 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-600">
          <FaRocketchat className="text-5xl text-white" />
        </div>

        <h1 className="my-5 text-center text-3xl font-bold text-gray-800">
          Messenger
        </h1>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError("");
            }}
            className={`rounded-md py-2 font-semibold ${
              !isRegister ? "bg-blue-600 text-white" : "text-gray-600"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError("");
            }}
            className={`rounded-md py-2 font-semibold ${
              isRegister ? "bg-blue-600 text-white" : "text-gray-600"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border p-3 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && (
            <p className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? "Create Account"
                : "Login"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          {isRegister
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="font-semibold text-blue-600"
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}
