import { supabase } from './src/lib/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

async function test() {
  const newTransaction = {
    id: 'user-1_' + uuidv4(),
    date: '2026-05-04',
    reason: 'Test Custom ID',
    amount: -10
  };
  const { data, error } = await supabase.from('transactions').insert([newTransaction]).select();
  if (error) {
    console.error('ERROR:', error.message);
  } else {
    console.log('SUCCESS:', data);
    // clean up
    await supabase.from('transactions').delete().eq('id', newTransaction.id);
  }
}
test();
