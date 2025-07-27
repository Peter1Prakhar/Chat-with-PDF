'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as React from 'react';

// Define the expected structure of a document retrieved from the vector store
interface Doc {
  pageContent?: string;
  metadata?: {
    loc?: {
      pageNumber?: number;
    };
    source?: string;
  };
}

// Define the structure of a chat message to be displayed
interface IMessage {
  role: 'assistant' | 'user';
  content?: string;
  documents?: Doc[]; // Optional, only for assistant messages with retrieved context
}

// Define the expected structure of the API response from /chat
interface ChatApiResponse {
  message: string;
  docs: Doc[];
}

const ChatComponent: React.FC = () => {
  const [message, setMessage] = React.useState<string>('');
  const [messages, setMessages] = React.useState<IMessage[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false); // State for loading indicator

  const handleSendChatMessage = async () => {
    if (!message.trim()) return; // Prevent sending empty messages

    const userMessage: IMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMessage]);
    setMessage(''); // Clear input field
    setLoading(true); // Set loading state

    try {
      const res = await fetch(`http://localhost:8000/chat?message=${encodeURIComponent(userMessage.content || '')}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      // Explicitly type the data coming from the API
      const data = (await res.json()) as ChatApiResponse;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data?.message, // 'message' property now correctly typed
          documents: data?.docs, // 'docs' property now correctly typed
        },
      ]);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && message.trim() && !loading) {
      handleSendChatMessage();
    }
  };

  return (
    <div className="p-4 flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto pb-20"> {/* Add padding bottom for input */}
        {messages.map((msg, index) => (
          <div key={index} className={`mb-4 p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-100 self-end ml-auto' : 'bg-gray-100 self-start mr-auto'} max-w-[80%]`} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <p className="font-semibold capitalize">{msg.role}:</p>
            <p>{msg.content}</p>
            {msg.documents && msg.documents.length > 0 && (
              <div className="mt-2 text-sm text-gray-600 border-t pt-2">
                <p className="font-medium">Source Documents:</p>
                {msg.documents.map((doc, docIndex) => (
                  <div key={docIndex} className="ml-2 mt-1">
                    {doc.metadata?.source && <p>File: {doc.metadata.source}</p>}
                    {doc.metadata?.loc?.pageNumber && <p>Page: {doc.metadata.loc.pageNumber}</p>}
                    <p className="italic overflow-hidden text-ellipsis whitespace-nowrap">{doc.pageContent?.substring(0, 100)}...</p> {/* Show snippet */}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="mb-4 p-3 rounded-lg bg-gray-100 self-start mr-auto max-w-[80%]">
            <p className="font-semibold">Assistant:</p>
            <p>Thinking...</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-[30vw] right-0 p-4 bg-white border-t flex gap-3 z-10">
        <Input
          value={message}
          // Corrected type for the event: React.ChangeEvent<HTMLInputElement>
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
          placeholder="Type your message here"
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        <Button onClick={handleSendChatMessage} disabled={!message.trim() || loading}>
          Send
        </Button>
      </div>
    </div>
  );
};

export default ChatComponent;