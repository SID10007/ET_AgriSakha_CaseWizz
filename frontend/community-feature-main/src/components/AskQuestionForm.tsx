
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, X } from 'lucide-react';
import VoiceInput from './VoiceInput';

interface AskQuestionFormProps {
  onSubmit: (question: {
    title: string;
    description: string;
    tags: string[];
    author: string;
  }) => void;
}

const AskQuestionForm: React.FC<AskQuestionFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [author, setAuthor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim().toLowerCase())) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    
    setIsSubmitting(true);
    
    // Simulate form submission with delay
    setTimeout(() => {
      onSubmit({
        title,
        description,
        tags,
        author: author.trim() || 'Anonymous'
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setTags([]);
      setAuthor('');
      setIsSubmitting(false);
    }, 1000);
  };

  const handleVoiceInput = (data: {
    question: string;
    description: string;
    name?: string;
    tags: string[];
  }) => {
    setTitle(data.question);
    setDescription(data.description);
    if (data.name) setAuthor(data.name);
    setTags(data.tags);
  };

  return (
    <div className='flex flex-col items-center justify-end mt-14'>
    <Card className="w-full max-w-2xl mx-auto shadow-sm animate-fade-in bg-[#fccd03] ">
      <CardHeader>
        <CardTitle className="text-2xl">Ask a Question</CardTitle>
        <CardDescription>
          Share your financial query with the community
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <VoiceInput 
          onTranscriptionComplete={handleVoiceInput}
          className="mb-6" 
        />
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Question Title</Label>
            <Input
              id="title"
              placeholder="E.g., How to apply for a rural credit card?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide details about your question..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              // className='bg-gray-00'
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="Add tags and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-2 py-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="author">Your Name (Optional)</Label>
            <Input
              id="author"
              placeholder="Anonymous"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
        </form>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          className="w-full btn-ripple bg-black text-white" 
          disabled={!title.trim() || !description.trim() || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Post Question"}
        </Button>
      </CardFooter>
    </Card>
    </div>
  );
};

export default AskQuestionForm;
