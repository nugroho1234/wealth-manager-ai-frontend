/**
 * TypeScript types for Comparison Chatbot
 * Phase 6 of Enhanced Product Comparison Feature
 */

// ================================
// Chat Message Types
// ================================

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: string;

  // Only for assistant messages
  references?: Reference[];
  source?: "rag" | "markdown";
  tier?: string;
  insurance_id?: string;
  products?: ProductInfo[];
}

export interface ProductInfo {
  insurance_id: string;
  insurance_name: string;
}

// ================================
// Reference Types
// ================================

export interface PageReference {
  page: number;  // Backend sends 'page', not 'page_number'
  section: string;  // Backend sends 'section' with the text
  chunk_index?: number;
}

export interface SectionReference {
  insurance_id: string;
  insurance_name: string;
  sections: string[];
}

export type Reference = PageReference | SectionReference;

// ================================
// API Request/Response Types
// ================================

export interface ChatRequest {
  question: string;
  insurance_ids: string[];
  chat_history: Array<{
    role: ChatRole;
    content: string;
  }>;
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}

export interface CostBreakdown {
  input_cost_usd: number;
  output_cost_usd: number;
  total_cost_usd: number;
}

export interface AnswerResponse {
  type: "answer";
  answer: string;
  source: "rag" | "markdown";

  // From RAG (Phase 3)
  tier?: string;
  insurance_id?: string;
  insurance_name?: string;
  chunks_retrieved?: number;

  // From Markdown (Phase 4)
  products?: ProductInfo[];

  // Common fields
  references: Reference[];
  token_usage: TokenUsage;
  cost: CostBreakdown;
  processing_time_ms: number;
  model_used: string;
  timestamp: string;
}

export interface ClarificationOption {
  id: string;
  name: string;
}

export interface ClarificationResponse {
  type: "clarification";
  message: string;
  detected_products: ProductInfo[];
  options: ClarificationOption[];
  timestamp: string;
}

export type ChatResponse = AnswerResponse | ClarificationResponse;

// ================================
// Component Props Types
// ================================

// Re-export comprehensive InsuranceProduct from insurance-product types
export type { InsuranceProduct } from './insurance-product';

// Minimal product info used in chat contexts (backwards compatible)
export interface MinimalProductInfo {
  insurance_id: string;
  insurance_name: string;
  pdf_url?: string;
}

export interface ComparisonChatbotProps {
  insuranceIds: string[];
  products: MinimalProductInfo[];
}

export interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
  pdfUrl?: string;
}

export interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder?: string;
}

export interface ClarificationButtonsProps {
  message: string;
  options: ClarificationOption[];
  onSelect: (productId: string, productName: string) => void;
}

export interface LoadingIndicatorProps {
  text?: string;
}

// ================================
// Utility Types
// ================================

export interface ChatError {
  message: string;
  code?: string;
  canRetry?: boolean;
}

// Type guards
export function isPageReference(ref: Reference): ref is PageReference {
  return "page" in ref;
}

export function isSectionReference(ref: Reference): ref is SectionReference {
  return "sections" in ref;
}

export function isAnswerResponse(response: ChatResponse): response is AnswerResponse {
  return response.type === "answer";
}

export function isClarificationResponse(
  response: ChatResponse
): response is ClarificationResponse {
  return response.type === "clarification";
}
