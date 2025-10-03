export default function ForgotId(){
  return (
    <main style={{minHeight:"100svh",display:"grid",placeItems:"center"}}>
      <div style={{width:460,maxWidth:"96%",border:"1px solid #e5e7eb",borderRadius:14,padding:16,background:"#fff"}}>
        <h2 style={{fontWeight:900,marginBottom:8}}>아이디 찾기</h2>
        <p style={{color:"#555"}}>현재는 관리자에게 문의해주세요. 등록된 이메일/전화 기준으로 확인해 드립니다.</p>
        <div style={{marginTop:12}}>
          <a href="/sign-in" style={{textDecoration:"underline"}}>로그인으로 돌아가기</a>
        </div>
      </div>
    </main>
  );
}
