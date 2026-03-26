import { redirect } from 'next/navigation';

export default function OrchestratorPage() {
  // Instantly redirect users hitting the root URL to the terminal module
  redirect('/terminal');
}