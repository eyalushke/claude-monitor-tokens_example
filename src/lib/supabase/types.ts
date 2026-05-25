export interface Session {
  id: string;
  project_path: string;
  project_name: string;
  started_at: string;
  ended_at: string | null;
  message_count: number;
  tool_call_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_creation_tokens: number;
  git_branch: string | null;
  claude_version: string | null;
  is_subagent: boolean;
  parent_session_id: string | null;
  created_at: string;
}

export interface Message {
  id: number;
  session_id: string;
  message_uuid: string | null;
  timestamp: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  cache_1h_tokens: number;
  cache_5m_tokens: number;
  web_search_requests: number;
  web_fetch_requests: number;
  service_tier: string | null;
  speed: string | null;
  tool_names: string[];
  tool_count: number;
  created_at: string;
}

export interface ToolUsage {
  id: number;
  message_id: number;
  session_id: string;
  tool_name: string;
  timestamp: string;
  created_at: string;
}

export interface DailyAggregate {
  id: number;
  date: string;
  project_name: string | null;
  model: string | null;
  session_count: number;
  message_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cache_read_tokens: number;
  total_cache_creation_tokens: number;
  total_tool_calls: number;
  web_search_count: number;
}

export interface ToolDailyAggregate {
  id: number;
  date: string;
  tool_name: string;
  invocation_count: number;
  associated_input_tokens: number;
  associated_output_tokens: number;
}

export interface SyncState {
  id: number;
  last_sync_at: string;
  files_processed: number;
  messages_ingested: number;
  last_file_mtime: string | null;
  status: string;
}
