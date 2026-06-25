import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/store';
import { getSupabaseClient } from '../services/supabase';

type TeacherInvite = {
  id: string;
  code: string;
  teacher_name: string | null;
  teacher_email: string | null;
  trial_days: number;
  max_uses: number | null;
  uses: number;
  created_at: string;
};

type TeacherStudent = {
  student_id: string;
  code: string | null;
  created_at: string;
  student_email: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  asaas_subscription_id: string | null;
};

export function TeacherDashboard() {
  const { authUser, signIn } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<TeacherInvite[]>([]);
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [teacherName, setTeacherName] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');

  const sb = useMemo(() => getSupabaseClient(), []);

  useEffect(() => {
    if (!authUser) return;
    void load();
  }, [authUser]);

  async function load() {
    if (!sb) return;
    setBusy(true);
    setError(null);
    try {
      const { data: me } = await sb.auth.getUser();
      const email = me.user?.email ?? authUser?.email ?? '';
      setTeacherEmail(email);
      const [{ data: inviteRows }, { data: studentRows }] = await Promise.all([
        sb.from('teacher_codes').select('code, teacher_name, teacher_email, trial_days, max_uses, uses, created_at').eq('teacher_email', email).order('created_at', { ascending: false }),
        sb.from('teacher_students')
          .select('student_id, code:teacher_code, created_at, student_email:profiles!teacher_students_student_id_fkey(email), plan:subscriptions!teacher_students_student_id_fkey(plan), status:subscriptions!teacher_students_student_id_fkey(status), current_period_end:subscriptions!teacher_students_student_id_fkey(current_period_end), trial_ends_at:subscriptions!teacher_students_student_id_fkey(trial_ends_at), asaas_subscription_id:subscriptions!teacher_students_student_id_fkey(asaas_subscription_id)')
          .eq('teacher_id', me.user?.id || authUser?.id || '')
          .order('created_at', { ascending: false }),
      ]);
      setInvites((inviteRows ?? []) as TeacherInvite[]);
      setStudents((studentRows ?? []) as TeacherStudent[]);
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar dashboard');
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!sb || !authUser) return;
    setBusy(true);
    setError(null);
    try {
      const { error: upsertErr } = await sb.from('teachers').upsert({
        id: authUser.id,
        email: teacherEmail || authUser.email,
        teacher_name: teacherName || null,
      }, { onConflict: 'id' });
      if (upsertErr) throw upsertErr;
      await load();
    } catch (e: any) {
      setError(e.message || 'Falha ao salvar professor');
    } finally {
      setBusy(false);
    }
  }

  async function createCode() {
    if (!sb || !authUser) return;
    if (!teacherCode.trim()) { setError('Informe um código.'); return; }
    setBusy(true);
    setError(null);
    try {
      const { error: upsertErr } = await sb.from('teacher_codes').upsert({
        code: teacherCode.trim().toUpperCase(),
        teacher_name: teacherName || authUser.email,
        teacher_email: teacherEmail || authUser.email,
        trial_days: 30,
        max_uses: null,
      }, { onConflict: 'code' });
      if (upsertErr) throw upsertErr;
      setTeacherCode('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Falha ao criar código');
    } finally {
      setBusy(false);
    }
  }

  if (!authUser) {
    return <div className="card p-6 text-center text-slate-300">Entre com Google para acessar o dashboard do professor.</div>;
  }

  return (
    <div className="space-y-6 pb-24">
      <div className="card p-6 space-y-3">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Professor</div>
        <h1 className="text-2xl font-black display">Dashboard do Professor</h1>
        <p className="text-sm text-slate-400">Acompanhe códigos, alunos e ganhos estimados.</p>
      </div>

      {error && <div className="card p-4 border-red-500/30 text-red-300 text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Seu perfil</div>
          <input value={teacherName} onChange={e => setTeacherName(e.target.value)} placeholder="Seu nome" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm" />
          <input value={teacherEmail} onChange={e => setTeacherEmail(e.target.value)} placeholder="Seu e-mail" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm" />
          <button onClick={saveProfile} disabled={busy} className="btn-primary w-full text-sm py-3">Salvar perfil</button>
        </div>

        <div className="card p-5 space-y-3">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Criar código</div>
          <input value={teacherCode} onChange={e => setTeacherCode(e.target.value)} placeholder="EX: JOAO30" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm uppercase" />
          <button onClick={createCode} disabled={busy} className="btn-primary w-full text-sm py-3">Gerar código</button>
          <p className="text-[11px] text-slate-500">Cada código libera 30 dias de teste e depois vira assinatura recorrente.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Stat title="Códigos ativos" value={invites.length} />
        <Stat title="Alunos cadastrados" value={students.length} />
        <Stat title="Receita estimada" value={`R$ ${students.length * 16.5}`.replace('.', ',')} />
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Meus códigos</div>
        <div className="space-y-2">
          {invites.map(code => (
            <div key={code.code} className="flex items-center justify-between gap-3 bg-white/5 rounded-xl px-3 py-2">
              <div>
                <div className="font-bold">{code.code}</div>
                <div className="text-[11px] text-slate-400">{code.uses} usos · {code.trial_days} dias</div>
              </div>
              <div className="text-xs text-slate-400">{code.teacher_email}</div>
            </div>
          ))}
          {invites.length === 0 && <div className="text-sm text-slate-500">Nenhum código ainda.</div>}
        </div>
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">Meus alunos</div>
        <div className="space-y-2">
          {students.map(s => (
            <div key={s.student_id} className="bg-white/5 rounded-xl px-3 py-2 text-sm flex items-center justify-between gap-3">
              <div>
                <div className="font-bold">{s.student_email ?? s.student_id.slice(0, 8)}</div>
                <div className="text-[11px] text-slate-400">{s.code ?? '—'} · {s.status ?? '—'} · {s.plan ?? '—'}</div>
              </div>
              <div className="text-[11px] text-slate-400 text-right">
                <div>Receita estimada: R$ {(s.plan === 'pro-yearly' ? 347 : 54.9).toFixed(2).replace('.', ',')}</div>
                <div>Até: {s.current_period_end ?? s.trial_ends_at ?? '—'}</div>
              </div>
            </div>
          ))}
          {students.length === 0 && <div className="text-sm text-slate-500">Nenhum aluno ainda.</div>}
        </div>
      </div>

      <button onClick={load} disabled={busy} className="btn-ghost w-full">Atualizar</button>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="card p-5 text-center">
      <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">{title}</div>
      <div className="text-3xl font-black mt-2 neon-text">{value}</div>
    </div>
  );
}
