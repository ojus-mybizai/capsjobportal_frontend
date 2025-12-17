export class ApiError extends Error {
  constructor(message, status, data) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status || 0;
    this.data = data;
  }
}

export function buildApiErrorFromResponse(response) {
  if (!response) {
    return new ApiError("Network error. Please check your connection.", 0, null);
  }

  const data = response.data || {};
  const apiError = data.error || data;

  const message =
    (apiError && (apiError.message || apiError.detail || apiError.error)) ||
    data.message ||
    `Request failed with status ${response.status}`;

  return new ApiError(message, response.status, apiError);
}

export function normalizeAxiosError(error) {
  if (error instanceof ApiError) return error;

  if (error && error.response) {
    return buildApiErrorFromResponse(error.response);
  }

  if (error && error.message) {
    return new ApiError(error.message, error.status || 0, error.data);
  }

  return new ApiError("Unexpected error occurred", 0, null);
}
