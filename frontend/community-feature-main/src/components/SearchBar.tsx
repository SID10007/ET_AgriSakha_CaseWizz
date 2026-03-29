
import React, { useState, useRef } from 'react';
import { Search, Mic } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { processVoiceInput, transcribeAudio } from '@/services/geminiService';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, className }) => {
  const [query, setQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = handleAudioData;
      
      mediaRecorder.start();
      setIsRecording(true);
      toast.info("Recording started. Speak your question now.");
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast.error("Couldn't access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleAudioData = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      toast.info("Transcribing your voice input...");
      
      try {
        // Use the actual transcription service
        const transcription = await transcribeAudio(audioBlob);
        console.log("Transcription received:", transcription);
        
        if (transcription) {
          toast.info(`Transcribed: "${transcription.substring(0, 50)}${transcription.length > 50 ? '...' : ''}"`);
          
          // Process with Gemini to refine the query
          try {
            const refinedQuery = await processVoiceInput(transcription);
            setQuery(refinedQuery);
            onSearch(refinedQuery);
            setIsProcessing(false);
            toast.success("Voice input processed!");
          } catch (error) {
            console.error('Error processing with Gemini:', error);
            // Use the raw transcription if Gemini fails
            setQuery(transcription);
            onSearch(transcription);
            setIsProcessing(false);
            toast.info("Used transcription directly due to processing error.");
          }
        } else {
          throw new Error("Empty transcription received");
        }
      } catch (error) {
        console.error('Error during transcription:', error);
        toast.error("Failed to transcribe audio. Please try again.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error handling audio data:', error);
      toast.error("Failed to process recording.");
      setIsProcessing(false);
    }
  };

  return (
    <Card className={cn("overflow-hidden shadow-sm bg-gradient-to-b from-black to-gray-900 border-r border-white/10", className)}>
      <CardContent className="p-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for agricultural questions..."
              className="pl-9 pr-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <Button
            type="button"
            size="icon"
            variant={isRecording ? "destructive" : "secondary"}
            className={`rounded-full btn-transition ${isRecording ? 'animate-pulse-subtle' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
          >
            <Mic className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button type="submit" className="rounded-md btn-ripple btn-transition">
            Search
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default SearchBar;
