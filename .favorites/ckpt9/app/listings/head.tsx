export default function Head(){
  return (
    <>
      <style>{`html.daesu-hide{opacity:0!important;transition:none!important}`}</style>
      <script dangerouslySetInnerHTML={{__html:`!function(){document.documentElement.classList.add('daesu-hide')}();`}} />
    </>
  );
}
