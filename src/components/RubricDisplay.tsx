import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RubricData } from './RubricEditor';

interface RubricDisplayProps {
  questionNumber: number;
  rubric: RubricData | null;
}

export const RubricDisplay = ({ questionNumber, rubric }: RubricDisplayProps) => {
  if (!rubric) {
    return null;
  }

  if (rubric.type === 'image' && rubric.imageUrl) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">평가 기준</CardTitle>
        </CardHeader>
        <CardContent>
          <img 
            src={rubric.imageUrl} 
            alt={`문항 ${questionNumber} 루브릭`} 
            className="max-h-64 mx-auto rounded-lg"
          />
        </CardContent>
      </Card>
    );
  }

  if (rubric.type === 'table' && rubric.criteria) {
    return (
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">평가 기준</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="border p-2 text-left font-medium">점수</th>
                  <th className="border p-2 text-left font-medium">수행 특성</th>
                </tr>
              </thead>
              <tbody>
                {rubric.criteria.map((criterion, index) => (
                  <tr key={index} className="hover:bg-muted/50">
                    <td className="border p-2 font-medium whitespace-nowrap">
                      {criterion.score}
                    </td>
                    <td className="border p-2">
                      {criterion.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
