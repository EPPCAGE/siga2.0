(function initSecurityUtils(globalScope){
  function esc(value){
    return String(value ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  function safeUrl(url){
    if(!url) return '';
    try {
      const parsed = new URL(url);
      if(parsed.protocol === 'https:' || parsed.protocol === 'http:') return url;
    } catch(error) {
      console.warn('safeUrl: invalid URL', error);
    }
    return '';
  }

  globalScope.esc = esc;
  globalScope.safeUrl = safeUrl;
})(globalThis);
