
import React, { useState, useRef } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";
import { extractQuestionDetails, transcribeAudio } from '@/services/geminiService';

interface VoiceInputProps {
  onTranscriptionComplete: (data: {
    question: string;
    description: string;
    name?: string;
    tags: string[];
  }) => void;
  className?: string;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptionComplete, className }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      toast.info("Recording started. Describe your question in detail...");
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
      toast.info("Processing your voice input...");
    }
  };

  const handleAudioData = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Transcribe the audio using Whisper via Groq
      try {
        const transcription = await transcribeAudio(audioBlob);
        console.log("Transcription result:", transcription);
        
        if (transcription) {
          toast.info(`Transcribed: "${transcription.substring(0, 50)}${transcription.length > 50 ? '...' : ''}"`);
          
          // Process with Gemini
          try {
            const result = await extractQuestionDetails(transcription);
            onTranscriptionComplete(result);
            setIsProcessing(false);
            toast.success("Voice input processed successfully!");
          } catch (error) {
            console.error('Error processing with Gemini:', error);
            // Fallback to using just the transcription
            const fallbackResult = {
              question: transcription.split('.')[0] || "New Question",
              description: transcription,
              tags: ["voice", "question"]
            };
            onTranscriptionComplete(fallbackResult);
            setIsProcessing(false);
            toast.success("Voice processed with basic formatting.");
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
    <div className={className}>
      <Button
        type="button"
        variant={isRecording ? "destructive" : "outline"}
        size="lg"
        className={`w-full rounded-md btn-transition flex items-center justify-center gap-2 ${
          isRecording ? 'animate-pulse-subtle' : ''
        }`}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        <Mic className={`h-5 w-5 ${isProcessing ? 'animate-spin' : ''}`} />
        <span>
          {isRecording 
            ? "Stop Recording" 
            : isProcessing 
              ? "Processing..." 
              : "Speak Your Question"}
        </span>
      </Button>
      {isRecording && (
        <p className="text-sm text-center mt-2 text-muted-foreground animate-pulse">
          Recording... Click the button again to stop.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
