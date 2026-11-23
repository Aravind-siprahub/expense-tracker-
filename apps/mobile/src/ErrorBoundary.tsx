import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

interface State {
  failed: boolean;
}

/**
 * Last line of defence: if a screen throws while rendering, show a friendly message with a retry button
 * instead of a blank screen or a closed app. Written without the shared UI kit on purpose, so it still works
 * if that code is what failed.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#f5f8ff' }}>
        <View style={{ height: 56, width: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2' }}>
          <TriangleAlert size={28} color="#f43f5e" />
        </View>
        <Text style={{ marginTop: 16, fontSize: 20, fontWeight: '700', color: '#0f172a' }}>Something went wrong</Text>
        <Text style={{ marginTop: 6, textAlign: 'center', fontSize: 14, color: '#64748b' }}>
          The app hit an unexpected problem. Your data is safe. Try again, and restart the app if it keeps happening.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => this.setState({ failed: false })}
          style={{ marginTop: 20, borderRadius: 12, backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12 }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#ffffff' }}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}
