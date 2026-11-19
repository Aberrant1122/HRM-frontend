const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.HRM_CHROME_PATH});
 try{
  const p=await browser.newPage();p.setDefaultTimeout(12000);
  await p.addInitScript(()=>{const token='synthetic.qa15.fixture';localStorage.setItem('token',token);localStorage.setItem('user',JSON.stringify({id:1,fullName:'Synthetic Admin',role:'admin',token}));});
  const queue=[];
  await p.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
   if(url.port!=='13695')return route.continue();
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});
   if(url.pathname.endsWith('/coverage/options')){queue.push(route);return;}
   return route.fulfill({status:200,json:{success:false}});
  });
  await p.goto('http://127.0.0.1:13694/admin/attendance/coverage');
  await p.getByRole('combobox',{name:'Account coverage scope'}).selectOption('selected-accounts');
  const input=p.getByLabel('Find retained account'),search=p.getByRole('button',{name:'Search retained accounts',exact:true}),more=p.getByRole('button',{name:'More matching accounts'});
  async function pending(){for(let i=0;i<100&&!queue.length;i++)await new Promise(r=>setTimeout(r,10));assert.ok(queue.length,'Expected delayed account options request');return queue.shift();}
  async function finish(route,label,failed=false,hasMore=false){const url=route.request().url(),res=p.waitForResponse(r=>r.url()===url);await route.fulfill({status:failed?503:200,headers:{'Access-Control-Allow-Origin':'*'},json:failed?{message:'Stale synthetic error'}:{data:{rows:[{id:11,fullName:label,email:'account@example.invalid',role:'employee',status:'active'}],hasMore}}});await res;await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
  await input.fill('first');await search.click();const oldSuccess=await pending();assert.equal(await search.isEnabled(),false);
  await input.fill('replacement');assert.equal(await search.isEnabled(),true);await search.click();const replacement=await pending();
  await finish(oldSuccess,'Stale success');assert.equal(await search.isEnabled(),false);assert.equal(await p.getByText(/Stale success/).count(),0);
  await finish(replacement,'Current choice',false,true);await more.click();const oldFailure=await pending();assert.equal(await more.isEnabled(),false);
  await input.fill('final');assert.equal(await more.count(),0);assert.equal(await search.isEnabled(),true);await search.click();const final=await pending();
  await finish(oldFailure,'',true);assert.equal(await search.isEnabled(),false);assert.equal(await p.getByText('Stale synthetic error').count(),0);
  await finish(final,'Final choice');await p.getByText(/Final choice/).first().waitFor();assert.equal(await search.isEnabled(),true);assert.equal(await p.getByText(/Current choice/).count(),0);
  console.log('PASS Chrome compiled raw attendance search: delayed initial success and delayed paging failure, editable input, immediate recovery, stale options/errors suppressed, current request remains busy, final results usable.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
