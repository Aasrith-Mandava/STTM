import axiosInstance from "../utils/axios-interceptor";
import { MESSAGES } from "../config/messages";

interface SessionData {
  appName: string | null;
  sessionId: string | null;
  userId: string | null;
}

type ConversationItem = {
  actions?: {
    stateDelta?: {
      query_execution_output?: string;
    };
  };
};

export const getQueryExecutionOutput = (
  data: ConversationItem[],
): string | null => {
  for (const item of data) {
    const output = item.actions?.stateDelta?.query_execution_output;
    if (output) {
      return output;
    }
  }
  return null;
};

export const sendInitialMessage = async (
  fileNames: string[],
  sessionData: SessionData,
) => {
  const initialText = `Do the profiling for the following files: ${fileNames.join(", ")}`;

  const response = await axiosInstance.post("/messages/send", {
    appName: sessionData.appName,
    sessionId: sessionData.sessionId,
    userId: sessionData.userId,
    newMessage: {
      parts: [{ text: initialText }],
      role: "user",
    },
    streaming: false,
    stateDelta: {},
  });

  let botResponseText = MESSAGES.DEFAULTS.DEFAULT_BOT_RESPONSE;

  if (response.status === 200) {
    const data = response.data;

    if (data && Array.isArray(data)) {
      const modelResponse = data[0].text_response;
      if (modelResponse?.content?.parts?.[0]?.text) {
        botResponseText = modelResponse.content.parts[0].text;
      }
      return { data, botResponseText, initialText };
    } else if (typeof data === "object") {
      const _data = [data];
      const modelResponse = _data.find(
        (item) =>
          item.content?.role === "model" && item.content?.parts?.[0]?.text,
      );
      if (modelResponse?.content?.parts?.[0]?.text) {
        botResponseText = modelResponse.content.parts[0].text;
      }
      return { data: _data, botResponseText, initialText };
    }
  }

  return { data: [], botResponseText, initialText };
};

export const sendQAMessage = async (
  message: string,
  sessionData: SessionData,
) => {
  const response = await axiosInstance.post("/messages/qa", {
    appName: sessionData.appName,
    sessionId: sessionData.sessionId,
    userId: sessionData.userId,
    newMessage: message,
    streaming: false,
    stateDelta: {},
  });

  if (response.status === 200) {
    const data = response.data;
    let botResponseText =
      "I understand your question. Let me help you with that.";

    if (data && Array.isArray(data)) {
      const queryExecutionOutput = getQueryExecutionOutput(data);
      if (queryExecutionOutput) {
        botResponseText = queryExecutionOutput;
      }
    }

    return botResponseText;
  }

  throw new Error("Failed to send QA message");
};

export const checkSimilarity = async (
  dartTableEntries: { dartTable: string; column: string }[],
  sourceTables: string[],
  sessionData: SessionData,
  dynamicFilters: any[],
  databaseName: string,
) => {
  const dartReferences = dartTableEntries
    .filter((entry) => entry.dartTable && entry.column)
    .map(
      (entry) => `- Table: ${entry.dartTable}\n- Columns: ["${entry.column}"]`,
    )
    .join("\n");
  console.log("Calling the API");

  const message = `Match columns with Reference tables using these parameters:\n\nDART References:\n${dartReferences}\n\nSource Tables:\n- ${sourceTables.join("\n- ")}`;

  const response = await axiosInstance.post(
    "/messages/similarity-check",
    {
      appName: sessionData.appName,
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      newMessage: {
        parts: [{ text: message }],
        role: "user",
      },
      streaming: false,
      stateDelta: {},
      dart_database_name: databaseName, // HARDCODED FOR TESTING
      filters: dynamicFilters, // HARDCODED FOR TESTING
    },
    {
      headers: { "Content-Type": "application/json" },
    },
  );

  return JSON.stringify(response.data, null, 2);
};
