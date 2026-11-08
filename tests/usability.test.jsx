import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import OperationalTable from '../src/components/tables/OperationalTable';
import {Dialog} from '../src/components/ui';
import {downloadCSV} from '../src/lib/export';
import {date} from '../src/lib/format';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('provides working row selection, sortable headings and record links',()=>{
 const sort=vi.fn(),select=vi.fn(),all=vi.fn();render(<MemoryRouter><OperationalTable rows={[{_id:'a',name:'Carrots',price:1250}]} columns={[['name','PRODUCT'],['price','PRICE','money']]} organization={{locale:'en-US',currency:'USD'}} sort={{key:'name',direction:'asc'}} onSort={sort} selected={new Set()} onSelect={select} onSelectAll={all} rowLink={r=>`/records/products/${r._id}`}/></MemoryRouter>);
 expect(screen.getByRole('link',{name:'Carrots'})).toHaveAttribute('href','/records/products/a');expect(screen.getByText('$12.50')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:/PRICE/}));expect(sort).toHaveBeenCalledWith('price');fireEvent.click(screen.getByRole('checkbox',{name:'Select Carrots'}));expect(select).toHaveBeenCalledWith('a',true);fireEvent.click(screen.getByRole('checkbox',{name:'Select all rows on this page'}));expect(all).toHaveBeenCalledWith(true);
});
it('requires discard confirmation before closing a dirty form',()=>{
 const close=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
 render(<Dialog title="Edit product" onClose={close}><form data-dirty="true"><input aria-label="Name" defaultValue="Carrot"/></form></Dialog>);fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));expect(close).not.toHaveBeenCalled();expect(screen.getByRole('heading',{name:'Discard unsaved changes?'})).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Discard changes'}));expect(close).toHaveBeenCalledOnce();
});
it('exports currency in major units and neutralizes spreadsheet formulas',async()=>{
 let blob;URL.createObjectURL=vi.fn(value=>{blob=value;return 'blob:test';});URL.revokeObjectURL=vi.fn();vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
 downloadCSV('orders.csv',[['name','CLIENT'],['total','TOTAL','money']],[{name:'=HYPERLINK("bad")',total:12345}]);
 const content=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob);});expect(content).toContain('TOTAL (currency units)');expect(content).toContain('123.45');expect(content).toContain("'=HYPERLINK");expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});
it('keeps UTC period-end labels on their intended calendar day',()=>{expect(date('2026-10-26T23:59:59.999Z')).toContain('26');expect(date('2026-10-26T23:59:59.999Z')).not.toContain('27');});
