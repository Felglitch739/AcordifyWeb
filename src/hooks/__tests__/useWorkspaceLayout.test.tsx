import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import useWorkspaceLayout from '../useWorkspaceLayout';

// Small test harness component that exposes the hook and renders the order
function TestHarness({ initial }: { initial: string[] }) {
  const { order, handleDragEnd } = useWorkspaceLayout(initial);

  return (
    <div>
      <div data-testid="list">
        {order.map((id) => (
          <div key={id} data-testid={`item-${id}`}>
            {id}
          </div>
        ))}
      </div>
      <button data-testid="move-a-to-c" onClick={() => handleDragEnd('a', 'c')}>
        Move A to C
      </button>
    </div>
  );
}

describe('useWorkspaceLayout (DOM integration)', () => {
  it('updates DOM order when handleDragEnd is triggered', () => {
    // Provide a lightweight localStorage mock for the JSDOM test environment
    const mockStore: Record<string, string> = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => (key in mockStore ? mockStore[key] : null),
        setItem: (key: string, value: string) => { mockStore[key] = String(value); },
        removeItem: (key: string) => { delete mockStore[key]; },
        clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
      },
      configurable: true,
    });
    const { container, getByTestId } = render(<TestHarness initial={["a", "b", "c"]} />);

    const itemsBefore = container.querySelectorAll('[data-testid^="item-"]');
    expect(itemsBefore.length).toBe(3);
    expect(itemsBefore[0].textContent).toBe('a');
    expect(itemsBefore[1].textContent).toBe('b');
    expect(itemsBefore[2].textContent).toBe('c');

    // Simulate user action that triggers a drag end (programmatic)
    fireEvent.click(getByTestId('move-a-to-c'));

    const itemsAfter = container.querySelectorAll('[data-testid^="item-"]');
    expect(itemsAfter.length).toBe(3);
    // moving 'a' from index 0 to index 2 yields ['b','c','a']
    expect(itemsAfter[0].textContent).toBe('b');
    expect(itemsAfter[1].textContent).toBe('c');
    expect(itemsAfter[2].textContent).toBe('a');
  });
});
