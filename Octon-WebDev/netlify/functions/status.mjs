import {json} from './_shared.mjs';
export async function handler(){
  return json(200,{
    version:'1.0.0',
    githubWriteEnabled:process.env.OCTON_GITHUB_WRITE_ENABLED==='true',
    githubConfigured:Boolean(process.env.GITHUB_TOKEN&&process.env.GITHUB_OWNER),
    approvalsConfigured:Boolean(process.env.OCTON_APPROVAL_SECRET),
    supabaseConfigured:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY)
  });
}
