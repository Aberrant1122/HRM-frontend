const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.HRM_CHROME_PATH});try{
 const p=await browser.newPage(),queue=[];p.setDefaultTimeout(12000);await p.addInitScript(()=>{localStorage.setItem('token','syntheticQ16');localStorage.setItem('user',JSON.stringify({id:1,role:'admin',token:'syntheticQ16'}));});
 await p.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.port!=='13695')return route.continue();if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});if(u.pathname.endsWith('/overtime')){queue.push(route);return;}return route.fulfill({json:{success:false}});});
 async function next(){for(let i=0;i<200&&!queue.length;i++)await new Promise(r=>setTimeout(r,10));assert.ok(queue.length);return queue.shift()}
 async function respond(route,status=200){await route.fulfill({status,headers:{'Access-Control-Allow-Origin':'*'},json:status===200?{period:{name:'Synthetic private period',startDate:'2032-01-01',endDate:'2032-01-31'},summary:{records:26,known:26,positive:26,missing:0,totalHours:'26.00'},hasMore:true,rows:Array.from({length:25},(_,i)=>({id:i+1,employeeId:i+2,fullName:'Private employee '+i,status:'paid',currency:'PKR',overtimeHours:'1.00',workedHours:'8.00',overtimePay:'10.00'}))}:{message:'Synthetic failure '+status}});}
 await p.goto('http://127.0.0.1:13694/admin/payroll-record-report/periods/1/overtime');await respond(await next());await p.getByRole('row').nth(25).waitFor();
 for(const status of [403,500]){
 await p.getByRole('button',{name:'More overtime records'}).click();await respond(await next(),status);await p.getByRole('alert').filter({hasText:'Synthetic failure'}).waitFor();assert.equal(await p.locator('tbody tr').count(),0);assert.equal(await p.getByRole('button',{name:'More overtime records'}).count(),0);assert.equal(await p.getByText('Synthetic private period',{exact:true}).count(),0);
 await p.getByRole('button',{name:'Retry',exact:true}).click();await respond(await next());await p.getByRole('row').nth(25).waitFor();
 }
 console.log('PASS compiled Chrome: 25 loaded private rows, current next-page 403 and 500 clear rows/period/pager, each Retry reloads successfully.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
