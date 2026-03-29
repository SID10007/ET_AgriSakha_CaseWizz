
import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare } from 'lucide-react';

interface QuestionCardProps {
  id: string;
  title: string;
  description: string;
  author: {
    name: string;
    avatar?: string;
  };
  tags: string[];
  answerCount: number;
  createdAt: string;
  isTranslated?: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  title,
  description,
  author,
  tags,
  answerCount,
  createdAt,
  isTranslated = false
}) => {
  return (
    <Link to={`/question/${id}`}>
      <Card className={`card-hover overflow-hidden bg-[#fccd03] mt-4 ${isTranslated ? 'border-primary/30' : ''}`}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              <div className="flex flex-wrap gap-2 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="px-2 py-0.5 text-xs text-white bg-black/70">
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardTitle className="line-clamp-2 text-lg font-semibold">{title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-black line-clamp-2 text-sm mb-4">--{'>'} {description}</p>
        </CardContent>
        <CardFooter className="flex justify-between pt-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={author.avatar} alt={author.name} />
              <AvatarFallback className="text-xs">{author.name.substring(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">{author.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{answerCount}</span>
            </div>
            <span className="text-xs text-muted-foreground">{createdAt}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
};

export default QuestionCard;
