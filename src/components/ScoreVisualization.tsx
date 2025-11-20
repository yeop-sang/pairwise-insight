import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AggregatedScore {
  response_id: string;
  student_code: string;
  q1_score?: number;
  q2_score?: number;
  q3_score?: number;
  q4_score?: number;
  q5_score?: number;
  total_score: number;
  rank: number;
}

interface ScoreVisualizationProps {
  scores: AggregatedScore[];
  selectedQuestions: number[];
}

export const ScoreVisualization = ({
  scores,
  selectedQuestions
}: ScoreVisualizationProps) => {
  const histogramData = useMemo(() => {
    const bins = [0, 20, 40, 60, 80, 100];
    const counts = bins.slice(0, -1).map((min, i) => ({
      range: `${min}-${bins[i + 1]}`,
      count: scores.filter(s => s.total_score >= min && s.total_score < bins[i + 1]).length
    }));
    return counts;
  }, [scores]);

  const averageScores = useMemo(() => {
    return selectedQuestions.map(q => ({
      question: `Q${q}`,
      average: scores.reduce((sum, s) => {
        const score = s[`q${q}_score` as keyof AggregatedScore] as number | undefined;
        return sum + (score ?? 0);
      }, 0) / scores.length
    }));
  }, [scores, selectedQuestions]);

  const radarData = useMemo(() => {
    const top5 = scores.slice(0, 5);
    return selectedQuestions.map(q => {
      const dataPoint: any = { question: `Q${q}` };
      top5.forEach(student => {
        const score = student[`q${q}_score` as keyof AggregatedScore] as number | undefined;
        dataPoint[student.student_code] = score ?? 0;
      });
      return dataPoint;
    });
  }, [scores, selectedQuestions]);

  const top5Students = scores.slice(0, 5);

  return (
    <Tabs defaultValue="histogram" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="histogram">히스토그램</TabsTrigger>
        <TabsTrigger value="radar">레이더차트</TabsTrigger>
        <TabsTrigger value="average">문항별 평균</TabsTrigger>
      </TabsList>

      <TabsContent value="histogram">
        <Card>
          <CardHeader>
            <CardTitle>총점 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={histogramData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="학생 수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="radar">
        <Card>
          <CardHeader>
            <CardTitle>학생별 레이더차트 (상위 5명)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="question" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {top5Students.map((student, i) => (
                  <Radar
                    key={student.student_code}
                    name={student.student_code}
                    dataKey={student.student_code}
                    stroke={`hsl(${i * 72}, 70%, 50%)`}
                    fill={`hsl(${i * 72}, 70%, 50%)`}
                    fillOpacity={0.3}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="average">
        <Card>
          <CardHeader>
            <CardTitle>문항별 평균 점수</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={averageScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="question" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" fill="hsl(var(--primary))" name="평균 점수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
