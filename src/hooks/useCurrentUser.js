
import { useEffect, useState } from "react";

export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem(
          "iqms_token"
        );

        if (!token) {
          setUser(null);
          return;
        }

        const response = await fetch(
          "http://localhost:1700/api/user/me",
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.msg || "Failed to load profile"
          );
        }

        setUser(data.user);

      } catch (err) {
        if (err.name !== "AbortError") {
          setUser(null);
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchCurrentUser();

    return () => {
      controller.abort();
    };
  }, []);

  return { user, loading, error };
};
