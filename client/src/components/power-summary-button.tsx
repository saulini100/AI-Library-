import React, { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, Zap, BookOpen } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PowerSummaryButtonProps {
  documentId: number;
  chapter: number;
  chapterData?: {
    title: string;
    paragraphs: Array<{ text: string }>;
  };
  onComplete?: () => void;
}

interface PowerSummary {
  powerSummary: string;
  keyInsights: string[];
  mainThemes: string[];
  actionablePoints: string[];
}

export default function PowerSummaryButton({ documentId, chapter, chapterData, onComplete }: PowerSummaryButtonProps) {
  const [showSummary, setShowSummary] = useState(false);
  const queryClient = useQueryClient();

  const summaryMutation = useMutation({
    mutationFn: async () => {
      let text: string;
      let title: string;
      
      if (chapterData) {
        // Use provided chapter data
        text = chapterData.paragraphs.map(p => p.text).join(' ');
        title = chapterData.title;
      } else {
        // Fetch chapter data from API
        const chapterResponse = await fetch(`/api/documents/${documentId}/chapter/${chapter}`);
        if (!chapterResponse.ok) {
          throw new Error('Failed to fetch chapter data');
        }
        const chapterInfo = await chapterResponse.json();
        text = chapterInfo.paragraphs.map((p: any) => p.text).join(' ');
        title = chapterInfo.title;
      }
      
      const response = await fetch('/api/ai-power-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          chapter,
          text,
          title
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate power summary');
      }

      const data = await response.json();
      return data.summary as PowerSummary;
    },
    onSuccess: (summary) => {
      setShowSummary(true);
      // Cache the summary
      queryClient.setQueryData([`power-summary-${documentId}-${chapter}`], summary);
      onComplete?.();
    },
  });

  const handleGenerateSummary = () => {
    if (showSummary) {
      setShowSummary(false);
    } else {
      summaryMutation.mutate();
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleGenerateSummary}
        disabled={summaryMutation.isPending}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
        size="sm"
      >
        {summaryMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Power Summary...
          </>
        ) : showSummary ? (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Hide Summary
          </>
        ) : (
          <>
            <Zap className="mr-2 h-4 w-4" />
            Generate Power Summary
          </>
        )}
      </Button>

      {summaryMutation.isError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">
            Failed to generate summary. Please try again.
          </p>
        </div>
      )}

      {showSummary && summaryMutation.data && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
          <div className="flex items-center mb-3">
            <Zap className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-purple-800">Power Summary</h3>
          </div>
          
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border-l-4 border-purple-400">
              <p className="text-gray-800 font-medium text-sm">
                {summaryMutation.data.powerSummary}
              </p>
            </div>

            {summaryMutation.data.keyInsights.length > 0 && (
              <div>
                <h4 className="font-medium text-purple-700 mb-2 text-sm">Key Insights:</h4>
                <ul className="space-y-1">
                  {summaryMutation.data.keyInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-purple-500 mr-2">•</span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summaryMutation.data.mainThemes.length > 0 && (
              <div>
                <h4 className="font-medium text-purple-700 mb-2 text-sm">Main Themes:</h4>
                <div className="flex flex-wrap gap-1">
                  {summaryMutation.data.mainThemes.map((theme, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {summaryMutation.data.actionablePoints.length > 0 && (
              <div>
                <h4 className="font-medium text-purple-700 mb-2 text-sm">Action Points:</h4>
                <ul className="space-y-1">
                  {summaryMutation.data.actionablePoints.map((point, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <span className="text-pink-500 mr-2">→</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 