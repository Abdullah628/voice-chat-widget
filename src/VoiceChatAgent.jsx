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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // API Configuration
  const API_URL = "https://ai.optimalmd.com/api/chat/completions";
  const API_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjE4MTIyZjU0LTFjYmYtNDFlOC04MzBjLWYwY2U3YWRmM2Y3ZCJ9.NRdH5xgY-f0WDQdBdKnq2NcdKdJ3yogr8Kr1WSFHn5s";
  
  // Google Cloud Configuration
  const GOOGLE_CLOUD_PROJECT_ID = "your-google-cloud-project-id";
  const GOOGLE_CLOUD_API_KEY = "AIzaSyCb_qFX6qfqbyA0jUMq5EFx2KQIZPsGTKc";
  // const GOOGLE_CLOUD_TTS_VOICE = "en-US-Wavenet-D"; // You can change this to other voices
  const GOOGLE_CLOUD_TTS_VOICE = "bn-IN-Wavenet-A"; // You can change this to other voices

  // Helper function to format timestamps
  function formatTimestamp(date) {
    return `${date.getDate()} May, ${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  // Initialize audio and cleanup
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);
    audioRef.current.onerror = () => setIsSpeaking(false);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stopRecording();
    };
  }, []);

  // Toggle chat window
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start recording audio from microphone
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsListening(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't access your microphone. Please check permissions.",
        timestamp: formatTimestamp(new Date()),
      }]);
    }
  };

  // Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  // Toggle voice recording
  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
      setInputValue(""); // Clear input when starting to listen
    }
  };

  // Transcribe audio using Google Cloud Speech-to-Text
  const transcribeAudio = async (audioBlob) => {
    try {
      // Convert Blob to base64
      const audioBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'WEBM_OPUS', // Adjust based on your recording format
              sampleRateHertz: 48000, // Adjust based on your recording
              languageCode: 'bn-BD', // Change language as needed
              alternativeLanguageCodes: ['en-US', 'bn-IN', 'bn-BD'], // Add likely languages here
              enableAutomaticPunctuation: true,
              model: 'default',
            },
            audio: {
              content: audioBase64,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Google Cloud STT API error: ${response.status}`);
      }

      const data = await response.json();
      const transcript = data.results?.[0]?.alternatives?.[0]?.transcript || '';
      
      if (transcript) {
        setInputValue(transcript);
        
        // Automatically submit the voice input
        setTimeout(() => {
          const submitEvent = { preventDefault: () => {} };
          handleSubmit(submitEvent);
        }, 500);
      } else {
        throw new Error("No transcript returned");
      }
    } catch (error) {
      console.error("Error transcribing audio:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, there was an error transcribing your voice. Please try typing instead.",
        timestamp: formatTimestamp(new Date()),
      }]);
    }
  };

  // Convert text to speech using Google Cloud Text-to-Speech
  const speakText = async (text) => {
    if (!text) return;
    
    try {
      setIsSpeaking(true);
      
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            input: {
              text: text
            },
            voice: {
              languageCode: "bn-BD", // Change language as needed
              name: GOOGLE_CLOUD_TTS_VOICE
            },
            audioConfig: {
              audioEncoding: "MP3", // You can also use "LINEAR16" or "OGG_OPUS"
              speakingRate: 1.10, // Adjust speaking rate (0.25 to 4.0)
              pitch: -2.0, // Adjust pitch (-20.0 to 20.0)
              volumeGainDb: 3.0, // Adjust volume (-96.0 to 16.0)
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Google Cloud TTS API error: ${response.status}`);
      }

      const data = await response.json();
      const audioContent = data.audioContent;
      
      if (audioRef.current) {
        // Create an audio source from the base64 content
        audioRef.current.src = `data:audio/mp3;base64,${audioContent}`;
        audioRef.current.play().catch(e => {
          console.error("Audio playback error:", e);
          setIsSpeaking(false);
        });
      }
    } catch (error) {
      console.error("Error with Google Cloud TTS:", error);
      setIsSpeaking(false);
    }
  };

  // Stop speech playback
  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsSpeaking(false);
    }
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    if (e.preventDefault) e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

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
          model: "qwen2.5:14b-instruct-q8_0",
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
          speakText(aiMessageContent);
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

  // Reset chat to initial state
  const resetChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Welcome to OptimalMD, let us help you quickly! Ask anything you need to know and we will answer you as fast as we can.",
        timestamp: formatTimestamp(new Date()),
      },
    ]);
  };

  // Class name concatenation helper
  const cn = (...classes) => {
    return classes.filter(Boolean).join(" ");
  };

  return (
    <div className="z-50 font-sans">
      {isOpen && (
        <div
          className="fixed bottom-20 right-5 w-80 md:w-96 h-[70%] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden mb-3 transform transition-all duration-300"
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
                        className="ml-2 p-1 rounded-full bg-opacity-20 hover:bg-opacity-30 transition-all"
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

            <div ref={messagesEndRef} />
          </div>

          <div className="p-2 border-t border-gray-200 bg-white">
            <form onSubmit={handleSubmit} className="flex items-center">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={isListening ? "Listening..." : "Type your message..."}
                  disabled={isLoading || isListening}
                  className="w-full py-2 px-4 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading}
                  className={cn(
                    "absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-full",
                    isListening 
                      ? "bg-red-500 text-white animate-pulse" 
                      : "bg-gray-200 hover:bg-gray-300 text-gray-700",
                    isLoading ? "opacity-50 cursor-not-allowed" : ""
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
                disabled={isLoading || !inputValue.trim() || isListening}
                className={cn(
                  "ml-2 p-2 rounded-full text-white",
                  isLoading || !inputValue.trim() || isListening
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