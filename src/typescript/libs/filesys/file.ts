export function save_old(data:string, filename: string): boolean {
      const data_type = 'text/plain;charset=utf-8';
      const data_bom = decodeURIComponent('%ef%bb%bf');
      if (window.navigator.msSaveBlob) {
          const blob = new Blob([data_bom + data],{type: data_type });
          window.navigator.msSaveBlob(blob, data);
      }
      else {
          const link = document.createElement('a');
          const content = data_bom + data;
          const uriScheme = ['data:', data_type, ','].join('');
          link.href = uriScheme + content;
          link.download = filename;
          //FF requires the link in actual DOM
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
      return true;
}

export function save(data:string, filename: string): boolean {
    let blob = new Blob([data], {type: 'text'});
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        const a = document.createElement('a');
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 0)
    }
    return true;
}
