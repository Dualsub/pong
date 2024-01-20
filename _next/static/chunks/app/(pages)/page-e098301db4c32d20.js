(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[281],{2484:function(e,t,s){Promise.resolve().then(s.bind(s,2181))},2279:function(e,t,s){"use strict";var r=s(7437);t.Z=e=>{let{value:t,className:s}=e;return(0,r.jsx)(r.Fragment,{children:(0,r.jsx)("div",{className:"px-2 py-1 w-fit rounded bg-accent-600 font-medium italic "+s,children:(0,r.jsx)("span",{className:"drop-shadow-md",children:t})})})}},2181:function(e,t,s){"use strict";s.r(t),s.d(t,{default:function(){return x}});var r=s(7437),l=s(6691),n=s.n(l),a=s(1396),c=s.n(a),i=s(3810),d=s(2265),o=s(2279),h=()=>{let[e,t]=(0,d.useState)([]),[s,l]=(0,d.useState)(!0);(0,d.useEffect)(()=>{fetch((0,i.t)("leaderboard")).then(e=>{if(e.ok)return e.json();throw console.log(e),Error("Failed to fetch leaderboard")}).catch(()=>[]).then(e=>e.sort((e,t)=>t.elo-e.elo)).then(e=>{t(e),l(!1)}).catch(e=>{l(!1)})},[]);let n=(0,d.useCallback)(()=>s?(0,r.jsx)("p",{children:"Loading..."}):0===e.length?(0,r.jsx)("p",{children:"No leaderboard found."}):(0,r.jsxs)(r.Fragment,{children:[(0,r.jsx)("h1",{className:"font-extrabold text-2xl mb-2 flex justify-center",children:"Leaderboard"}),(0,r.jsxs)("table",{className:"table-fixed w-full text-center mx-auto",children:[(0,r.jsx)("thead",{children:(0,r.jsxs)("tr",{className:"border-b",children:[(0,r.jsx)("th",{className:"px-4 py-2",children:"Rank"}),(0,r.jsx)("th",{className:"px-4 py-2",children:"Name"}),(0,r.jsx)("th",{className:"px-4 py-2",children:"ELO"})]})}),(0,r.jsx)("tbody",{children:e.map((e,t)=>(0,r.jsxs)("tr",{className:"border-b",children:[(0,r.jsx)("td",{className:"px-4 py-3",children:t+1}),(0,r.jsx)("td",{className:"px-4 py-3",children:e.name}),(0,r.jsx)("td",{className:"px-2 py-2 flex justify-center",children:(0,r.jsx)(o.Z,{value:e.elo})})]},e.name))})]})]}),[e,s]);return(0,r.jsx)("div",{className:"text-center",children:n()})},x=()=>(0,r.jsxs)(r.Fragment,{children:[(0,r.jsxs)("div",{className:"w-full flex justify-center items-center mb-8 flex-col text-center",children:[(0,r.jsx)("h1",{className:"font-bold text-3xl w-fit mb-4",children:"Multiplayer 3D Pong \uD83C\uDFD3"}),(0,r.jsxs)("p",{className:"text-sm max-w-3xl",children:["A project created for learning purposes. Client game written in C++ and compiled to WebAssembly using Emscripten. Graphics rendered with the new WebGPU-API. Game server written in Golang using Websockets. Please leave a ",(0,r.jsx)("b",{children:"star"})," on ",(0,r.jsx)("b",{children:"GitHub"})," if you can! \uD83C\uDF1F"]})]}),(0,r.jsxs)("div",{className:"my-8 px-4 mx-auto grid grid-flow-col w-fit gap-2 grid-cols-2 justify-evenly text-center max-w-2xl text-white drop-shadow-md",children:[(0,r.jsx)(c(),{className:"bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded w-full flex-1 block mb-10",href:"/play",children:"Play"}),(0,r.jsxs)(c(),{className:"bg-primary-500 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded w-full flex-1 flex  mb-10 flex-row items-center",href:"https://www.github.com/Dualsub/go-mp",children:[(0,r.jsx)(n(),{src:(0,i.A)("github-mark.svg"),alt:"Github",width:"16",height:"16"}),(0,r.jsx)("span",{className:"ml-2 whitespace-nowrap",children:"Github Repo"})]})]}),(0,r.jsx)(h,{})]})},3810:function(e,t,s){"use strict";s.d(t,{A:function(){return r},t:function(){return l}});let r=e=>"/go-mp/"+e,l=e=>"https://kurskollen.se/"+e}},function(e){e.O(0,[176,691,971,938,744],function(){return e(e.s=2484)}),_N_E=e.O()}]);