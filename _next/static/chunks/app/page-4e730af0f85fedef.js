(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[931],{9047:function(e,s,t){Promise.resolve().then(t.bind(t,5476))},5476:function(e,s,t){"use strict";t.r(s),t.d(s,{default:function(){return i}});var n=t(7437),l=t(2265),o=()=>{let[e,s]=(0,l.useState)([]),[t,o]=(0,l.useState)(!0);(0,l.useEffect)(()=>{fetch("http://localhost:5000/sessions",{mode:"cors"}).then(e=>{if(e.ok)return e.json();throw console.log(e),Error("Failed to fetch sessions")}).then(e=>{s(e),o(!1)}).catch(e=>{console.error(e),o(!1)})},[]);let r=(0,l.useCallback)(()=>t?(0,n.jsx)("p",{children:"Loading..."}):0===e.length?(0,n.jsx)("p",{children:"No sessions found."}):(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)("h1",{className:"font-extrabold text-2xl mb-2 flex justify-center",children:"Sessions"}),e.map(e=>(0,n.jsxs)("div",{className:"flex flex-col justify-center text-center max-w-2xl text-white drop-shadow-md",children:[(0,n.jsx)("h1",{className:"font-extrabold text-2xl mb-2",children:e.id}),(0,n.jsx)("p",{className:"md:text-base text-sm",children:e.numPlayers})]},e.id))]}),[e,t]);return(0,n.jsx)("div",{children:r()})},r=t(1396),c=t.n(r),i=()=>(0,n.jsxs)("div",{className:"flex flex-col justify-center w-fit mx-auto",children:[(0,n.jsx)(c(),{className:"bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-fit mx-auto block mb-10",href:"/game?id=0",children:"Play"}),(0,n.jsx)(o,{})]})}},function(e){e.O(0,[176,971,472,744],function(){return e(e.s=9047)}),_N_E=e.O()}]);