const assert=require('node:assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.HRM_CHROME_PATH});try{
 const context=await browser.newContext(),page=await context.newPage(),switcher=await context.newPage(),queue=[];
 await context.addInitScript(()=>{if(!localStorage.getItem('token')){localStorage.setItem('token','syntheticA');localStorage.setItem('user',JSON.stringify({id:1,role:'admin',fullName:'Synthetic administrator',token:'syntheticA'}));}});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();if(u.port!=='13695')return route.continue();if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'}});if(u.pathname.endsWith('/separation-report')){queue.push(route);return;}return route.fulfill({json:{success:false}});});
 await page.goto('http://127.0.0.1:13694/admin/offboarding-record-report');await switcher.goto('http://127.0.0.1:13694/robots.txt');
 const btn=page.getByRole('button',{name:'Run separation report'}),more=page.getByRole('button',{name:'More separation records'});
 async function filters(){await page.getByLabel('Separation dates from').fill('2032-01-01');await page.getByLabel('Separation dates through').fill('2032-02-01');await page.getByLabel('Separation report as of').fill('2032-03-01');}
 async function queued(){for(let i=0;i<200&&!queue.length;i++)await new Promise(r=>setTimeout(r,10));assert.ok(queue.length);return queue.shift()}
 async function switchTo(token){await switcher.evaluate(t=>localStorage.setItem('token',t),token);await page.waitForFunction(()=>document.querySelector('input[type=date]')!==null);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 async function finish(route,label,hasMore=false,status=200){const data={source:'reported-resignation',rows:[{id:hasMore?2:1,employeeId:2,fullName:label,eventDate:'2032-01-01'}],total:{records:2,people:1},coverage:{undated:0,otherType:0},hasMore};await route.fulfill({status,headers:{'Access-Control-Allow-Origin':'*'},json:status===200?{data}:{message:label}});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 await filters();await btn.click();await finish(await queued(),'Session A',true);await page.getByRole('cell',{name:/Session A/}).waitFor();
 await more.evaluate(el=>{el.click();el.click()});const oldSuccess=await queued();assert.ok(oldSuccess.request().url().includes('before=2'));assert.equal(queue.length,0);
 await switchTo('syntheticB');await page.getByRole('cell',{name:/Session A/}).waitFor({state:'detached'});assert.equal(queue.length,0);
 await filters();await btn.click();await finish(await queued(),'Session B',true);await page.getByRole('cell',{name:/Session B/}).waitFor();await finish(oldSuccess,'Obsolete A');assert.equal(await page.getByRole('cell',{name:/Obsolete A/}).count(),0);
 await more.click();const oldDenial=await queued();await switchTo('syntheticC');await filters();await btn.click();await finish(await queued(),'Session C',true);await finish(oldDenial,'Obsolete denial',false,403);await page.getByRole('cell',{name:/Session C/}).waitFor();assert.equal(await page.getByText('Obsolete denial').count(),0);
 await more.click();await finish(await queued(),'Second page');await page.getByRole('cell',{name:/Second page/}).waitFor();assert.equal(await page.getByRole('cell',{name:/Session C/}).count(),1);
 await btn.click();await finish(await queued(),'Current denial',false,403);await page.getByText('Current denial').waitFor();assert.equal(await page.getByRole('cell',{name:/Session C|Second page/}).count(),0);
 console.log('PASS compiled Chrome report: token-change reset with no fetch, obsolete success and denial isolated, same-query page appends once, current denial clears private rows.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
