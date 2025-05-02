"use client";

import React, { useState, useRef, useEffect } from "react";
import aiImg from "./assets/ai_agent.webp";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to OptimalMD, let us help you quickly! Ask anything you need to know and we will answer you as fast as we can.",
      timestamp: formatTimestamp(new Date()),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatEnded, setIsChatEnded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechSynthesisRef = useRef(null);

  const API_URL = "https://ai.optimalmd.com/api/chat/completions";
  const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE4MTIyZjU0LTFjYmYtNDFlOC04MzBjLWYwY2U3YWRmM2Y3ZCJ9.NRdH5xgY-f0WDQdBdKnq2NcdKdJ3yogr8Kr1WSFHn5s";

  function formatTimestamp(date) {
    return `${date.getDate()} May, ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          setIsListening(false);
          // Automatically submit the voice input
          setTimeout(() => {
            const submitEvent = { preventDefault: () => {} };
            handleSubmit(submitEvent);
          }, 500);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "Sorry, there was an error with voice recognition. Please try typing instead.",
            timestamp: formatTimestamp(new Date()),
          }]);
        };
      }

      speechSynthesisRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setIsChatEnded(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      const inactivityTimer = setTimeout(() => {
        if (messages.length > 0 && !isLoading) {
          setIsChatEnded(true);
        }
      }, 300000);

      return () => clearTimeout(inactivityTimer);
    }
  }, [isOpen, messages, isLoading]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      setInputValue(""); // Clear input when starting to listen
    }
  };

  const speakText = (text) => {
    if (speechSynthesisRef.current) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      setIsSpeaking(true);
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      speechSynthesisRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();
    if (!inputValue.trim() || isLoading || isChatEnded) return;

    const currentTime = new Date();
    const userMessage = {
      role: "user",
      content: inputValue,
      timestamp: formatTimestamp(currentTime),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "optimalmd-marketing-ai",
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const aiMessageContent = data.choices?.[0]?.message?.content;

      if (aiMessageContent) {
        setTimeout(() => {
          const aiMessage = {
            role: "assistant",
            content: aiMessageContent,
            timestamp: formatTimestamp(new Date()),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
          speakText(aiMessageContent); // Speak the AI response
        }, 1000);
      } else {
        throw new Error("No message in response");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: formatTimestamp(new Date()),
        },
      ]);
      setIsLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Welcome to OptimalMD, let us help you quickly! Ask anything you need to know and we will answer you as fast as we can.",
        timestamp: formatTimestamp(new Date()),
      },
    ]);
    setIsChatEnded(false);
  };

  const cn = (...classes) => {
    return classes.filter(Boolean).join(" ");
  };

  return (
    <div className="z-50 font-sans">
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 w-80 md:w-96 h-[700px] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden mb-3 transform transition-all duration-300"
          style={{
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div className="bg-blue-500 text-white p-4 flex justify-between items-center">
            <div className="flex items-center">
              <div className="relative">
                <img
                  src={aiImg}
                  alt="Assistant"
                  className="w-10 h-10 rounded-full border-2 border-white"
                />
              </div>
              <div className="ml-2">
                <h3 className="font-medium text-sm">Can we answer a question for</h3>
                <h3 className="font-medium text-sm">you today?</h3>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="text-white hover:bg-blue-600 rounded-full p-1 transition-colors"
              aria-label="Close chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 mr-2">
                    <img
                      src={aiImg}
                      alt="Assistant"
                      className="w-8 h-8 rounded-full"
                    />
                  </div>
                )}
                <div className="flex flex-row min-w-[50%] max-w-[85%]">
                  <div
                    className={cn(
                      "p-3 rounded-lg text-sm w-full",
                      message.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-800 rounded-bl-none"
                    )}
                  >
                    {message.content}
                    
                    <br />
                    <p className={cn(
                      "text-[10px] text-right mt-1 self-end",
                      message.role === "user" ? "text-gray-200" : "text-gray-600"
                    )}>
                      {message.timestamp}
                    </p>
                  </div>
                  {message.role === "assistant" && (
                      <button
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(message.content)}
                        className="ml-2 p-1 rounded-full  bg-opacity-20 hover:bg-opacity-30 transition-all"
                        aria-label={isSpeaking ? "Stop speaking" : "Speak message"}
                      >
                        {isSpeaking ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="6" y="4" width="4" height="16"></rect>
                            <rect x="14" y="4" width="4" height="16"></rect>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                          </svg>
                        )}
                      </button>
                    )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex">
                <div className="flex-shrink-0 mr-2">
                  <img
                    src={aiImg}
                    alt="Assistant"
                    className="w-8 h-8 rounded-full"
                  />
                </div>
                <div className="bg-gray-200 text-gray-800 p-3 rounded-lg rounded-bl-none max-w-[75%]">
                  <div className="flex space-x-1">
                    <span className="inline-block h-2 w-2 bg-gray-500 rounded-full" />
                    <span className="inline-block h-2 w-2 bg-gray-500 rounded-full" />
                    <span className="inline-block h-2 w-2 bg-gray-500 rounded-full" />
                  </div>
                </div>
              </div>
            )}

            {isChatEnded && (
              <div className="text-center space-y-2 py-3">
                <p className="text-gray-500 text-sm">Chat closed due to user inactivity</p>
                <p className="text-gray-500 text-sm">Your chat has ended</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 border-t border-gray-200 bg-white">
            {isChatEnded ? (
              <div className="text-center py-2">
                <button
                  onClick={resetChat}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm hover:bg-blue-600 transition-colors"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex items-center">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Type your message..."}
                    disabled={isLoading || isChatEnded || isListening}
                    className="w-full py-2 px-4 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 text-sm pr-12"
                  />
                  <button
                    type="button"
                    onClick={toggleListening}
                    disabled={isLoading || isChatEnded}
                    className={cn(
                      "absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full",
                      isListening 
                        ? "bg-red-500 text-white animate-pulse" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700",
                      isLoading || isChatEnded ? "opacity-50 cursor-not-allowed" : ""
                    )}
                    aria-label={isListening ? "Stop listening" : "Start voice input"}
                  >
                    {isListening ? (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim() || isChatEnded || isListening}
                  className={cn(
                    "ml-2 p-2 rounded-full text-white",
                    isLoading || !inputValue.trim() || isChatEnded || isListening
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 transition-colors"
                  )}
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            )}
          </div>

          <div className="py-2 px-3 text-center text-xs text-gray-500 border-t border-gray-200">
            Powered by <span className="text-blue-500">OptimalMD Technologies, LLC</span>
          </div>
        </div>
      )}

      <button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-5 right-5 w-14 h-14 rounded-full cursor-pointer shadow-lg flex items-center justify-center transition-all duration-300 text-white",
          "hover:scale-110",
          isOpen ? "bg-blue-600" : "bg-green-500 hover:bg-green-600"
        )}
        aria-label="Toggle chat"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  );
};

export default ChatWidget;