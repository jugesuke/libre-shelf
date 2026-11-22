export type SessionDetail = {
  id: number;
  event_location_id: number;
  event_location_name: string;
  event_date: string;
  session_json: string;
  uploaded_at: string;
};

// 各スキーマバージョンの本体コンポーネントが受け取る props
export type EventResultBodyProps = { sessionJson: string };
