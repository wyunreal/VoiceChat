import React from "react";

type ChatBubbleProps = {
  text: string;
  position?: "left" | "right";
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ text, position = "left" }) => {
  const isLeft = position === "left";

  return (
    <div
      className={`flex items-start m-4 ${
        isLeft ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`relative max-w-xs px-4 py-2 rounded-xl shadow ${
          isLeft ? "bg-gray-200 text-black" : "bg-blue-500 text-white"
        }`}
      >
        <div>{text}</div>
        <div
          className={`absolute top-3 w-0 h-0 border-t-8 border-b-8 ${
            isLeft
              ? "left-[-8px] border-r-8 border-t-transparent border-b-transparent border-r-gray-200"
              : "right-[-8px] border-l-8 border-t-transparent border-b-transparent border-l-blue-500"
          }`}
        />
      </div>
    </div>
  );
};

export default ChatBubble;
