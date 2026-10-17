import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductDemo } from './product-demo';
import { WebsiteNavigation } from './navigation';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Website product experience', () => {
  it('keeps the selected tab and panel in sync and carries edited writing into presentation', () => {
    render(<ProductDemo />);
    fireEvent.change(screen.getByRole('textbox', { name: '编辑示例正文' }), { target: { value: '一间属于街区的书店。' } });
    fireEvent.click(screen.getByRole('tab', { name: '梳理' }));
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('梳理');
    expect(screen.getByRole('tab', { name: '写作' })).toHaveAttribute('aria-selected', 'false');
    fireEvent.click(screen.getByRole('tab', { name: '展示' }));
    expect(screen.getByRole('tab', { name: '展示' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('展示');
    expect(screen.getByText('一间属于街区的书店。')).toBeVisible();
    expect(screen.getByRole('button', { name: '上一章' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '下一章' }));
    fireEvent.click(screen.getByRole('button', { name: '下一章' }));
    expect(screen.getByRole('button', { name: '下一章' })).toBeDisabled();
    fireEvent.click(screen.getByRole('tab', { name: '写作' }));
    expect(screen.getByRole('textbox', { name: '编辑示例正文' })).toHaveValue('一间属于街区的书店。');
  });

  it('supports keyboard tab navigation without losing focus', () => {
    render(<ProductDemo />);
    const writing = screen.getByRole('tab', { name: '写作' });
    writing.focus();
    fireEvent.keyDown(writing, { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: '梳理' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: '梳理' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: '展示' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('展示');
  });

  it('moves cards and connections together, resets positions, and retains the note across modes', () => {
    const { container } = render(<ProductDemo />);
    fireEvent.click(screen.getByRole('tab', { name: '梳理' }));
    const card = screen.getByRole('button', { name: /拖动卡片：从一次停留开始/ });
    const left = card.style.left;
    const connection = container.querySelector('.demo-board > svg > path')!;
    const path = connection.getAttribute('d');
    fireEvent.keyDown(card, { key: 'ArrowRight' });
    expect(card.style.left).not.toBe(left);
    expect(connection.getAttribute('d')).not.toBe(path);
    fireEvent.change(screen.getByRole('textbox', { name: '编辑示例便笺' }), { target: { value: '先采访附近读者' } });
    fireEvent.click(screen.getByRole('button', { name: '恢复布局 ↺' }));
    expect(card.style.left).toBe(left);
    fireEvent.click(screen.getByRole('tab', { name: '写作' }));
    fireEvent.click(screen.getByRole('tab', { name: '梳理' }));
    expect(screen.getByRole('textbox', { name: '编辑示例便笺' })).toHaveValue('先采访附近读者');
  });

  it('drags cards in canvas coordinates and stops moving after pointer release', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    const { container } = render(<ProductDemo />);
    fireEvent.click(screen.getByRole('tab', { name: '梳理' }));
    const board = container.querySelector('.demo-board')!;
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ width: 900, height: 360 } as DOMRect);
    const card = screen.getByRole('button', { name: /拖动卡片：从一次停留开始/ });
    card.setPointerCapture = vi.fn();
    const left = card.style.left;
    fireEvent.pointerDown(card, { button: 0, clientX: 40, clientY: 80 });
    fireEvent.pointerMove(card, { clientX: 130, clientY: 100 });
    expect(card.style.left).not.toBe(left);
    const draggedLeft = card.style.left;
    fireEvent.pointerUp(card);
    fireEvent.pointerMove(card, { clientX: 230, clientY: 100 });
    expect(card.style.left).toBe(draggedLeft);
  });

  it('switches preview themes without resetting content or the mode', () => {
    const { container } = render(<ProductDemo />);
    fireEvent.click(screen.getByRole('tab', { name: '展示' }));
    fireEvent.click(screen.getByRole('button', { name: '夜色皮肤' }));
    expect(screen.getByRole('button', { name: '夜色皮肤' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '纸白皮肤' })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('.product-demo')).toHaveClass('theme-night');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('展示');
  });
});

it('closes mobile navigation with Escape and returns focus to its trigger', () => {
  render(<WebsiteNavigation />);
  const trigger = screen.getByLabelText('打开导航菜单');
  const menu = trigger.closest('details')!;
  menu.open = true;
  fireEvent.keyDown(menu, { key: 'Escape' });
  expect(menu.open).toBe(false);
  expect(trigger).toHaveFocus();
});
