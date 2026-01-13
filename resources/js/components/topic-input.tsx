import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Topic {
    id?: number;
    name: string;
    slug?: string;
}

interface TopicInputProps {
    value: string[];
    onChange: (topics: string[]) => void;
    placeholder?: string;
}

export function TopicInput({ value, onChange, placeholder }: TopicInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [suggestions, setSuggestions] = useState<Topic[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // 既存topic検索
    useEffect(() => {
        if (inputValue.trim().length === 0) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const fetchSuggestions = async () => {
            try {
                const response = await fetch(
                    `/api/topics/search?q=${encodeURIComponent(inputValue)}`,
                );
                const data = await response.json();

                // 既に追加済みのtopicを除外
                const filtered = data.filter(
                    (topic: Topic) => !value.includes(topic.name),
                );

                setSuggestions(filtered);
                setShowSuggestions(filtered.length > 0);
                setSelectedIndex(0);
            } catch (error) {
                console.error('Failed to fetch topics:', error);
            }
        };

        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }, [inputValue, value]);

    const addTopic = (topicName: string) => {
        const trimmed = topicName.trim();

        if (trimmed === '' || value.includes(trimmed)) {
            return;
        }

        onChange([...value, trimmed]);
        setInputValue('');
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const removeTopic = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (showSuggestions && suggestions.length > 0) {
                addTopic(suggestions[selectedIndex].name);
            } else if (inputValue.trim()) {
                addTopic(inputValue);
            }
        } else if (e.key === 'ArrowDown' && showSuggestions) {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp' && showSuggestions) {
            e.preventDefault();
            setSelectedIndex((prev) =>
                prev === 0 ? suggestions.length - 1 : prev - 1,
            );
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        } else if (
            e.key === 'Backspace' &&
            inputValue === '' &&
            value.length > 0
        ) {
            removeTopic(value.length - 1);
        } else if (e.key === ',') {
            e.preventDefault();
            if (inputValue.trim()) {
                addTopic(inputValue);
            }
        }
    };

    return (
        <div className="relative">
            <div className="flex min-h-[42px] flex-wrap gap-2 rounded-md border border-input bg-background p-2">
                {value.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                        {topic}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 hover:bg-transparent"
                            onClick={() => removeTopic(index)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </Badge>
                ))}

                <Input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : ''}
                    className="flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
                />
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                    {suggestions.map((topic, index) => (
                        <button
                            key={topic.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                                index === selectedIndex ? 'bg-accent' : ''
                            }`}
                            onClick={() => addTopic(topic.name)}
                        >
                            {topic.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
