/**
 * API service for Oracle Comparison Chat
 * Phase 6 of Enhanced Product Comparison Feature
 */

import type {
  ChatRequest,
  ChatResponse,
  ChatMessage,
} from "@/types/oracle/comparison-chat";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("auth_tokens");
  if (!stored) {
    console.warn("No authentication tokens found in localStorage");
    return null;
  }

  try {
    const tokens = JSON.parse(stored);
    return tokens.access_token;
  } catch (error) {
    console.error("Failed to parse auth tokens:", error);
    return null;
  }
}

/**
 * Send a chat message to the comparison chat endpoint
 *
 * @param question User's question
 * @param insuranceIds List of insurance product IDs currently in comparison
 * @param chatHistory Previous chat messages for context
 * @returns ChatResponse (either answer or clarification)
 * @throws Error if request fails
 */
export async function sendChatMessage(
  question: string,
  insuranceIds: string[],
  chatHistory: ChatMessage[]
): Promise<ChatResponse> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Authentication token not found. Please log in again.");
  }

  // Format chat history for API (only role and content)
  const formattedHistory = chatHistory.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  const requestBody: ChatRequest = {
    question,
    insurance_ids: insuranceIds,
    chat_history: formattedHistory,
  };

  const response = await fetch(`${API_BASE_URL}/api/v1/oracle/compare/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Try to parse error message from response
    let errorMessage = "Failed to send message";
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // If parsing fails, use status text
      errorMessage = `${errorMessage}: ${response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const data: ChatResponse = await response.json();

  // Debug logging
  // console.log("[Compare API] Response received:", {
  //   type: data.type,
  //   hasAnswer: 'answer' in data,
  //   answerType: 'answer' in data ? typeof data.answer : 'N/A',
  //   answerIsString: 'answer' in data ? typeof data.answer === 'string' : false,
  //   answerLength: 'answer' in data && typeof data.answer === 'string' ? data.answer.length : 0,
  //   answerValue: 'answer' in data ? data.answer : null,
  //   hasClarification: 'message' in data,
  // });

  return data;
}

/**
 * Format a clarification selection into a follow-up question
 *
 * @param productId Selected product ID (or "all")
 * @param productName Selected product name
 * @param originalQuestion The original ambiguous question
 * @returns Formatted question string
 */
export function formatClarificationQuestion(
  productId: string,
  productName: string,
  originalQuestion: string
): string {
  if (productId === "all") {
    return `Compare all products: ${originalQuestion}`;
  }
  return `Regarding ${productName}: ${originalQuestion}`;
}
