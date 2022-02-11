import { h, render } from 'preact'
import 'virtual:windi.css'
import { App } from './app'
import { gitInit } from './Data/git'
import './index.css'

void gitInit()

render(
  <App />
  , document.getElementById('app')!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
)
