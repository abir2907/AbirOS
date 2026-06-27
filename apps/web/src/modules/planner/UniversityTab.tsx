import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, GraduationCap, CalendarClock, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  createAssignment,
  createCourse,
  createExam,
  generateExamPlan,
  getAssignments,
  getCourses,
  getExams,
  toggleAssignment,
} from '@/lib/api';

export function UniversityTab() {
  const courses = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const courseList = courses.data?.courses ?? [];

  return (
    <div className="space-y-6">
      <Courses />
      {courseList.length > 0 && (
        <>
          <Assignments courses={courseList} />
          <Exams courses={courseList} />
          <ExamPlan />
        </>
      )}
    </div>
  );
}

function Courses() {
  const qc = useQueryClient();
  const courses = useQuery({ queryKey: ['courses'], queryFn: getCourses });
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const create = useMutation({
    mutationFn: () => createCourse({ name: name.trim(), code: code.trim() || undefined }),
    onSuccess: () => {
      setName('');
      setCode('');
      qc.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GraduationCap className="size-4" /> Courses
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(courses.data?.courses ?? []).map((c) => (
            <Badge key={c.id} variant="secondary">
              {c.code ? `${c.code} · ` : ''}
              {c.name}
            </Badge>
          ))}
          {courses.data?.courses.length === 0 && (
            <span className="text-sm text-muted-foreground">No courses yet.</span>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="flex gap-2"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Course name" />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-28" />
          <Button type="submit" size="icon" variant="secondary" disabled={!name.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Assignments({ courses }: { courses: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['assignments'], queryFn: getAssignments });
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createAssignment({ courseId, title: title.trim(), dueAt: due ? new Date(due).toISOString() : undefined }),
    onSuccess: () => {
      setTitle('');
      setDue('');
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'todo' | 'done' }) => toggleAssignment(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ClipboardList className="size-4" /> Assignments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 space-y-1.5">
          {(list.data?.assignments ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
              <input
                type="checkbox"
                checked={a.status === 'done'}
                onChange={(e) => toggle.mutate({ id: a.id, status: e.target.checked ? 'done' : 'todo' })}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              <span className={cn('flex-1 text-sm', a.status === 'done' && 'text-muted-foreground line-through')}>
                <span className="text-muted-foreground">{a.courseName}:</span> {a.title}
              </span>
              {a.dueAt && (
                <span className="text-xs text-muted-foreground">{new Date(a.dueAt).toLocaleDateString()}</span>
              )}
            </div>
          ))}
          {list.data?.assignments.length === 0 && (
            <span className="text-sm text-muted-foreground">No assignments yet.</span>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (courseId && title.trim()) create.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Assignment" className="flex-1" />
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" />
          <Button type="submit" size="icon" variant="secondary" disabled={!title.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Exams({ courses }: { courses: { id: string; name: string }[] }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ['exams'], queryFn: getExams });
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [at, setAt] = useState('');

  const create = useMutation({
    mutationFn: () =>
      createExam({ courseId, title: title.trim(), examAt: at ? new Date(at).toISOString() : undefined }),
    onSuccess: () => {
      setTitle('');
      setAt('');
      qc.invalidateQueries({ queryKey: ['exams'] });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4" /> Exams
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 space-y-1.5">
          {(list.data?.exams ?? []).map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2 text-sm">
              <span className="flex-1">
                <span className="text-muted-foreground">{e.courseName}:</span> {e.title}
              </span>
              {e.examAt && <span className="text-xs text-muted-foreground">{new Date(e.examAt).toLocaleString()}</span>}
            </div>
          ))}
          {list.data?.exams.length === 0 && <span className="text-sm text-muted-foreground">No exams yet.</span>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (courseId && title.trim()) create.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-9 rounded-md border bg-transparent px-2 text-sm"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exam / midterm" className="flex-1" />
          <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="w-52" />
          <Button type="submit" size="icon" variant="secondary" disabled={!title.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ExamPlan() {
  const gen = useMutation({ mutationFn: generateExamPlan });
  const sessions = gen.data?.sessions ?? [];
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Exam-prep schedule</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending && <Loader2 className="size-4 animate-spin" />}
          Generate
        </Button>
      </CardHeader>
      <CardContent>
        {gen.isError && <p className="text-sm text-destructive">Failed — is Ollama running?</p>}
        {gen.isSuccess && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground">Add some exams or assignments first.</p>
        )}
        <div className="space-y-1.5">
          {sessions.map((sn, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2 text-sm">
              <Badge variant="outline" className="text-[10px]">
                {sn.when}
              </Badge>
              <span className="flex-1">
                {sn.course && <span className="text-muted-foreground">{sn.course}: </span>}
                {sn.focus}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
