(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('patientForm');
  const steps = Array.from(document.querySelectorAll('.form-step'));
  const indicators = Array.from(document.querySelectorAll('[data-indicator]'));
  const errorBox = $('errorBox');
  let current = 0;
  let cepController = null;
  const digits = value => String(value || '').replace(/\D/g, '');
  const trimmed = id => $(id).value.trim();

  function message(text) {
    errorBox.textContent = text;
    errorBox.hidden = !text;
    if (text) errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function markError(el, text) {
    if (!el) return false;
    el.setAttribute('aria-invalid', 'true');
    message(text);
    el.focus();
    return false;
  }
  function clearError() {
    message('');
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  }
  function formatCpf(input) {
    const n = digits(input).slice(0, 11);
    return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  function validCpf(input) {
    const cpf = digits(input);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const check = count => {
      const total = [...cpf.slice(0, count)].reduce((sum, char, i) => sum + Number(char) * (count + 1 - i), 0);
      return ((total * 10) % 11) % 10;
    };
    return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
  }
  function formatPhone(value) {
    const n = digits(value).replace(/^55(?=\d{10,11}$)/, '').slice(0, 11);
    if (n.length <= 2) return n ? '(' + n : '';
    if (n.length <= 6) return '(' + n.slice(0, 2) + ') ' + n.slice(2);
    const pivot = n.length > 10 ? 7 : 6;
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, pivot) + '-' + n.slice(pivot);
  }
  $('cpf').addEventListener('input', e => { e.target.value = formatCpf(e.target.value); e.target.removeAttribute('aria-invalid'); });
  $('telefone').addEventListener('input', e => { e.target.value = formatPhone(e.target.value); e.target.removeAttribute('aria-invalid'); });
  $('cep').addEventListener('input', e => {
    const n = digits(e.target.value).slice(0, 8);
    e.target.value = n.length > 5 ? n.slice(0, 5) + '-' + n.slice(5) : n;
    $('cepStatus').textContent = n.length === 8 ? 'Toque em “Buscar endereço” ou continue preenchendo manualmente.' : 'Preenchimento automático por CEP. Revise o resultado.';
    $('cepStatus').classList.remove('bad');
  });
  form.addEventListener('input', event => {
    if (event.target.matches('input,select')) event.target.removeAttribute('aria-invalid');
  });

  async function searchCep() {
    const cep = digits($('cep').value);
    if (cep.length !== 8) return markError($('cep'), 'Digite um CEP com oito números.');
    if (cepController) cepController.abort();
    cepController = new AbortController();
    const status = $('cepStatus');
    const button = $('cepLookup');
    button.disabled = true;
    status.textContent = 'Consultando o CEP…';
    status.classList.remove('bad');
    try {
      const response = await fetch('https://viacep.com.br/ws/' + cep + '/json/', {
        signal: cepController.signal, mode: 'cors', credentials: 'omit', cache: 'no-store'
      });
      if (!response.ok) throw new Error('Serviço indisponível');
      const data = await response.json();
      if (data.erro) throw new Error('CEP não encontrado');
      if (digits($('cep').value) !== cep) return;
      const fields = {
        logradouro: data.logradouro || '', bairro: data.bairro || '',
        cidade: data.localidade || '', uf: data.uf || ''
      };
      Object.keys(fields).forEach(key => { if (fields[key]) $(key).value = fields[key]; });
      status.textContent = 'Endereço encontrado. Confira a rua e informe o número.';
      $('numero').focus();
    } catch (err) {
      if (err.name === 'AbortError') return;
      status.textContent = 'Não foi possível localizar o endereço. Preencha os campos manualmente.';
      status.classList.add('bad');
    } finally {
      button.disabled = false;
    }
  }
  $('cepLookup').addEventListener('click', searchCep);
  $('cep').addEventListener('blur', () => {
    if (digits($('cep').value).length === 8 && !trimmed('logradouro')) searchCep();
  });
  const setVisibility = () => {
    $('symptomBox').hidden = form.elements.sintomas.value !== 'Sim';
    $('familyBox').hidden = form.elements.familia.value !== 'Sim';
  };
  document.querySelectorAll('input[name="sintomas"],input[name="familia"]').forEach(el => el.addEventListener('change', setVisibility));
  function selected(name) {
    return Array.from(form.querySelectorAll('input[name="' + name + '"]:checked')).map(el => el.value);
  }
  function ageFromDate(value) {
    if (!/^\d{4}-\d\d-\d\d$/.test(value)) return NaN;
    const d = new Date(value + 'T12:00:00');
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return NaN;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    if ((today.getMonth() + 1) * 100 + today.getDate() < (d.getMonth() + 1) * 100 + d.getDate()) age--;
    return age;
  }
  function validate(index) {
    clearError();
    const step = steps[index];
    for (const field of step.querySelectorAll('input[required]:not([type="radio"]):not([type="checkbox"]),select[required]')) {
      if (!field.value.trim() || !field.checkValidity()) return markError(field, 'Preencha todos os campos obrigatórios desta etapa.');
    }
    const groups = [...new Set(Array.from(step.querySelectorAll('input[type="radio"][required]')).map(el => el.name))];
    for (const name of groups) {
      if (!selected(name).length) return markError(step.querySelector('input[name="' + name + '"]'), 'Responda à pergunta obrigatória antes de continuar.');
    }
    if (index === 0) {
      if (trimmed('nome').replace(/\s+/g, ' ').split(' ').length < 2) return markError($('nome'), 'Informe seu nome completo.');
      if (!validCpf(trimmed('cpf'))) return markError($('cpf'), 'Confira o CPF informado.');
      const age = ageFromDate(trimmed('nascimento'));
      if (!Number.isFinite(age) || age < 18 || age > 115) return markError($('nascimento'), 'Este formulário individual é destinado a pessoas maiores de 18 anos. Confira a data de nascimento.');
      if (![10, 11].includes(digits(trimmed('telefone')).length)) return markError($('telefone'), 'Informe um número com DDD válido.');
      if (digits(trimmed('cep')).length !== 8) return markError($('cep'), 'Confira o CEP informado.');
      if (trimmed('uf').length !== 2 || !/^[a-zA-Z]{2}$/.test(trimmed('uf'))) return markError($('uf'), 'Informe a sigla da UF.');
    }
    if (index === 2) {
      if (!selected('exames').length) return markError(step.querySelector('input[name="exames"]'), 'Selecione ao menos uma opção de orientação.');
      if (!$('aceite').checked) return markError($('aceite'), 'Confirme a declaração de privacidade para gerar o PDF.');
      if (!window.jspdf?.jsPDF) {
        message('O gerador de PDF não foi carregado. Verifique sua conexão e atualize a página.');
        return false;
      }
    }
    return true;
  }
  function goTo(index) {
    current = index;
    clearError();
    steps.forEach((step, i) => { step.hidden = i !== index; });
    indicators.forEach((li, i) => {
      li.classList.toggle('active', i === index);
      li.classList.toggle('complete', i < index);
      if (i === index) li.setAttribute('aria-current', 'step');
      else li.removeAttribute('aria-current');
    });
    $('prevBtn').hidden = index === 0;
    $('nextBtn').hidden = index === 2;
    $('finishBtn').hidden = index !== 2;
    document.querySelector('.form-top').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }
  $('nextBtn').addEventListener('click', () => { if (validate(current)) goTo(Math.min(2, current + 1)); });
  $('prevBtn').addEventListener('click', () => goTo(Math.max(0, current - 1)));
  $('privacyLink').addEventListener('click', e => { e.preventDefault(); $('privacyDialog').showModal(); });
  $('closePrivacy').addEventListener('click', () => $('privacyDialog').close());

  function dataSnapshot() {
    return {
      nome: trimmed('nome'), cpf: trimmed('cpf'), nascimento: trimmed('nascimento'),
      idade: ageFromDate(trimmed('nascimento')), telefone: trimmed('telefone'),
      email: trimmed('email') || 'Não informado', cep: trimmed('cep'),
      logradouro: trimmed('logradouro'), numero: trimmed('numero'),
      complemento: trimmed('complemento') || '—', bairro: trimmed('bairro'),
      cidade: trimmed('cidade'), uf: trimmed('uf').toUpperCase(),
      sintomas: selected('sintomas')[0], sinais: selected('sinais').join(', ') || 'Não especificados',
      pessoal: selected('pessoal')[0], familia: selected('familia')[0],
      parentes: selected('parentes').join(', ') || 'Não especificados',
      familiaTipo: trimmed('familiaTipo') || 'Não informado',
      genetica: selected('genetica')[0], gestacao: selected('gestacao')[0],
      mamografia: $('mamografia').value, citopatologico: $('citopatologico').value,
      exames: selected('exames'), modalidade: 'Particular'
    };
  }
  function createPdf() {
    if (!window.jspdf?.jsPDF) throw new Error('A biblioteca de PDF não está disponível.');
    const d = dataSnapshot();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    pdf.setProperties({ title: 'Ficha de pré-avaliação | Outubro Rosa', subject: 'Informações declaradas pela paciente para avaliação clínica', creator: 'Dra. Joyce Radis – Formulário Outubro Rosa' });
    const W = 210, H = 297, L = 18, R = 18, usable = W - L - R;
    let y = 0, page = 0;
    const dark = [50, 36, 43], muted = [102, 90, 98], pink = [169, 108, 130];
    const dateFmt = value => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.split('-').reverse().join('/') : value;
    const today = new Date();
    const printDate = today.toLocaleString('pt-BR');
    const wrap = (str, width, fontSize = 9.4) => {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(String(str || 'Não informado'), width);
    };
    function header() {
      page++;
      pdf.setFillColor(...dark); pdf.rect(0, 0, W, 36, 'F');
      pdf.setTextColor(255, 251, 249); pdf.setFont('times', 'normal'); pdf.setFontSize(19); pdf.text('Dra. Joyce Radis', L, 17);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text('MÉDICA · CRM-ES 21188', L, 24.5);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.text('OUTUBRO ROSA  /  PRÉ-AVALIAÇÃO', W - R, 18, { align: 'right' });
      pdf.setTextColor(...muted); pdf.setFontSize(8.5);
      pdf.text('FICHA DECLARADA PELA PACIENTE · NÃO É PEDIDO MÉDICO', L, 44);
      pdf.setDrawColor(224, 214, 211); pdf.line(L, 48, W - R, 48);
      y = 58;
    }
    function footer() {
      pdf.setDrawColor(220, 206, 207); pdf.line(L, H - 22, W - R, H - 22);
      pdf.setTextColor(...muted); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.2);
      pdf.text('Documento confidencial. Encaminhar apenas à médica responsável.', L, H - 16);
      pdf.text('Página ' + page, W - R, H - 16, { align: 'right' });
      pdf.text('Gerado em: ' + printDate, L, H - 11);
    }
    function room(amount) { if (y + amount > H - 31) { footer(); pdf.addPage(); header(); } }
    function section(title) {
      room(18);
      pdf.setFillColor(249, 241, 242); pdf.rect(L, y - 1.5, usable, 9.5, 'F');
      pdf.setTextColor(...dark); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
      pdf.text(title.toUpperCase(), L + 3, y + 4.8);
      y += 16;
    }
    function item(label, val) {
      const value = String(val == null || val === '' ? 'Não informado' : val);
      const lines = wrap(value, usable - 6, 9.5);
      room(11 + lines.length * 4.6);
      pdf.setTextColor(...muted); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.2);
      pdf.text(label, L + 2, y);
      y += 5.3;
      pdf.setTextColor(...dark); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5);
      pdf.text(lines, L + 2, y);
      y += lines.length * 4.6 + 4.7;
    }
    function pair(leftLabel,leftVal,rightLabel,rightVal) {
      const first = wrap(leftVal,usable / 2 - 11,9.5);
      const second = wrap(rightVal,usable / 2 - 11,9.5);
      const count = Math.max(first.length,second.length);
      room(12 + count * 4.7);
      pdf.setTextColor(...muted);pdf.setFont('helvetica','bold');pdf.setFontSize(8.2);
      pdf.text(leftLabel,L + 2,y);pdf.text(rightLabel,L + usable/2 + 3,y);
      y += 5.3; pdf.setFont('helvetica','normal');pdf.setFontSize(9.5);pdf.setTextColor(...dark);
      pdf.text(first,L + 2,y);pdf.text(second,L + usable/2 + 3,y);
      y += count * 4.7 + 5;
    }
    header();
    section('1 · Identificação da paciente');
    item('Nome completo', d.nome);
    pair('CPF', d.cpf, 'Nascimento / idade', dateFmt(d.nascimento) + ' · ' + d.idade + ' anos');
    pair('WhatsApp', d.telefone, 'E-mail', d.email);
    section('2 · Endereço informado');
    pair('CEP', d.cep, 'Cidade / UF', d.cidade + ' / ' + d.uf);
    item('Logradouro e número', d.logradouro + ', ' + d.numero);
    pair('Bairro', d.bairro, 'Complemento', d.complemento);
    section('3 · Informações clínicas declaradas');
    item('Alteração mamária atual', d.sintomas);
    if (d.sintomas === 'Sim') item('Sintomas assinalados', d.sinais);
    pair('Histórico pessoal de câncer de mama/ovário', d.pessoal, 'Familiar de primeiro grau afetado', d.familia);
    if (d.familia === 'Sim') {
      item('Familiares assinalados', d.parentes);
      item('Tipo de câncer / idade ao diagnóstico', d.familiaTipo);
    }
    item('Mutação genética de risco conhecida na família', d.genetica);
    item('Gestação ou amamentação', d.gestacao);
    pair('Última mamografia', d.mamografia, 'Último preventivo ginecológico', d.citopatologico);
    section('4 · Orientação solicitada');
    item('Interesse da paciente', d.exames.join('; '));
    item('Modalidade disponível', d.modalidade + ' · sem credenciamento a convênio nesta modalidade');
    room(31);
    pdf.setFillColor(244, 238, 235); pdf.rect(L, y, usable, 25, 'F');
    pdf.setTextColor(...pink); pdf.setFont('helvetica','bold');pdf.setFontSize(9);
    pdf.text('IMPORTANTE', L + 4, y + 6);
    pdf.setTextColor(...dark);pdf.setFont('helvetica','normal');pdf.setFontSize(8);
    const disclaimer = wrap('Este documento reúne informações declaradas pela paciente. Não constitui consulta, laudo, prescrição, solicitação de exames ou assinatura médica. A avaliação e eventual emissão de pedidos são independentes.', usable - 10, 8);
    pdf.text(disclaimer.slice(0, 4), L + 4, y + 12);
    y += 33;
    footer();
    const clean = d.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 -]/g,'').trim().replace(/\s+/g,'-').slice(0,34).toLowerCase();
    const filename = 'outubro-rosa-ficha-' + clean + '.pdf';
    const blob = pdf.output('blob');
    return new File([blob], filename, { type: 'application/pdf' });
  }
  function getFile() {
    return createPdf();
  }
  function saveFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name; document.body.append(a);
    a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validate(current)) return;
    try {
      getFile(); // Só exibe conclusão se o PDF pode ser criado.
      $('activeForm').hidden = true;
      $('resultPanel').hidden = false;
      $('resultPanel').focus();
      $('resultPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      message('Não foi possível gerar o PDF. Verifique a conexão com a biblioteca e tente novamente.');
    }
  });
  $('downloadBtn').addEventListener('click', () => {
    try { saveFile(getFile()); }
    catch { alert('Falha ao gerar o PDF. Recarregue a página e tente novamente.'); }
  });
  $('shareBtn').addEventListener('click', async () => {
    try {
      const file = getFile();
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Ficha Outubro Rosa | Dra. Joyce Radis', text: 'Ficha confidencial para avaliação médica individual.' });
      } else {
        saveFile(file);
        alert('Seu PDF foi baixado. Envie-o à Dra. Joyce por uma conversa privada no WhatsApp.');
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') alert('Não foi possível compartilhar diretamente. Use o botão Baixar PDF.');
    }
  });
  $('editBtn').addEventListener('click', () => {
    $('resultPanel').hidden = true;
    $('activeForm').hidden = false;
    goTo(2);
  });
  goTo(0);
})();