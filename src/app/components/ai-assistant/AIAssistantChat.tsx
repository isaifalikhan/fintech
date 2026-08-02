import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const SAMPLE_RESPONSES = [
  {
    trigger: ['profit', 'margin'],
    response: 'Your profit margin for this month is 28%, which is 3.2% higher than last month. This improvement is primarily due to reduced cloud infrastructure costs and increased client revenue from the ABC Corp project.',
    suggestions: [
      'Show me department profitability',
      'Which clients are most profitable?',
      'How can I improve margins further?'
    ]
  },
  {
    trigger: ['cash', 'flow', 'balance'],
    response: 'Your current cash balance is PKR 2.5M. Based on your recurring expenses and scheduled payments, your balance may drop below PKR 500K in approximately 15 days. I recommend reviewing your accounts receivable and following up on overdue invoices.',
    suggestions: [
      'Show cash flow forecast',
      'List overdue invoices',
      'What are my upcoming expenses?'
    ]
  },
  {
    trigger: ['expense', 'spending'],
    response: 'Your top expense category this month is "Salaries & Wages" at PKR 850K (42% of total expenses), followed by "Cloud Infrastructure" at PKR 180K (9%). Compared to last month, overall expenses decreased by 5%.',
    suggestions: [
      'Show expense breakdown chart',
      'Compare expenses vs last quarter',
      'Which expenses can I reduce?'
    ]
  }
];

const QUICK_QUESTIONS = [
  'Why did profit drop last month?',
  'Show me cash flow forecast',
  'Which clients are most profitable?',
  'What are my biggest expenses?',
  'How is my budget tracking?'
];

export function AIAssistantChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hi! I\'m your AI financial assistant. Ask me anything about your finances, and I\'ll provide insights based on your data.',
      timestamp: new Date(),
      suggestions: QUICK_QUESTIONS
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = (text?: string) => {
    const messageText = text || inputValue.trim();
    if (!messageText) return;

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: messageText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate AI response
    setIsTyping(true);
    setTimeout(() => {
      // Find matching response
      const matchedResponse = SAMPLE_RESPONSES.find(sr => 
        sr.trigger.some(keyword => 
          messageText.toLowerCase().includes(keyword)
        )
      );

      const response = matchedResponse || {
        response: 'I can help you with that! Based on your data, I\'ll analyze this and provide insights. This is a demo response - in production, this would be powered by real AI analyzing your actual financial data.',
        suggestions: [
          'Show me detailed breakdown',
          'Compare with last month',
          'Export this data'
        ]
      };

      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        type: 'assistant',
        content: response.response,
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleQuickQuestion = (question: string) => {
    handleSend(question);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 bg-primary/10 border border-primary/15 rounded-full flex items-center justify-center shadow-[0_0_0_1px_rgba(58,125,255,0.15)] hover:shadow-[0_0_26px_rgba(58,125,255,0.15)] transition-all z-40 group"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6 text-primary" />
      </button>
    );
  }

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && !isMinimized && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 rounded-full p-4 border border-primary/15 bg-primary/10 hover:bg-primary/15 shadow-[0_0_0_1px_rgba(58,125,255,0.15)] hover:shadow-[0_0_40px_rgba(58,125,255,0.15)] transition-all"
          style={{
            background: 'transparent',
            boxShadow: 'none',
          }}
        >
          <Sparkles className="w-6 h-6 text-primary" />
        </motion.button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className={`fixed z-50 shadow-2xl border border-primary/15 overflow-hidden ${
            isMinimized ? 'bottom-6 right-6 w-80' : 'bottom-6 right-6 w-[500px] h-[700px]'
          }`}
          style={{
            background: '#121826',
            borderRadius: '16px',
          }}
        >
          {/* Header */}
          <div className="p-4 border-b border-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border border-primary/15">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">AI Assistant</h3>
                <p className="text-xs text-muted-foreground">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4" />
                ) : (
                  <Minimize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-primary/10 rounded transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} onQuickQuestion={handleQuickQuestion} />
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="flex gap-2">
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-primary/10 bg-[#121826]">
                <div className="flex items-start gap-3 justify-center">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      // Journal-style: Enter sends, Shift+Enter adds a new line.
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ask me anything... (press Enter to send)"
                    className="w-[65%] min-w-[280px] max-w-[720px] min-h-[96px] max-h-[140px] resize-none px-4 py-5 bg-[#121826] border border-[rgba(58,125,255,0.15)] rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[rgba(58,125,255,0.15)] focus-visible:ring-[3px] transition-shadow"
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim()}
                    variant="energy"
                    size="icon"
                    className="mt-7 shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      )}
    </>
  );
}

function MessageBubble({ 
  message, 
  onQuickQuestion 
}: { 
  message: Message;
  onQuickQuestion: (question: string) => void;
}) {
  const containerBase =
    "w-full rounded-xl border bg-white/5 border-white/10 px-5 py-4";
  const containerUser = "border-primary/15 bg-primary/5";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
      <div className={`${containerBase} ${message.type === 'user' ? containerUser : ''}`}>
        <p className="text-foreground text-sm leading-relaxed">{message.content}</p>

        {/* Guidance suggestions (not chat-bubble UI) */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {message.suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => onQuickQuestion(suggestion)}
                className="px-3 py-1.5 rounded-full bg-transparent border border-primary/10 text-xs text-muted-foreground hover:bg-primary/10 hover:text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}